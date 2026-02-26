// @ts-nocheck
import { SheetFooter } from "@/components/ui/sheet"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// Removed: import ImportTaskTemplateModal from "@/components/import-task-template-modal"
import { Switch } from "@/components/ui/switch" // Import Switch
import { ConfirmationDialog } from "@/components/confirmation-dialog" // Import ConfirmationDialog
// Removed: import { ProductSheet } from "@/components/admin/product-sheet"
// Removed: import { QuestionnaireSheet } from "@/components/admin/questionnaire-sheet"
// Removed: import { PricingCalculatorModal } from "@/components/admin/pricing-calculator-modal"
import { useToast } from "@/hooks/use-toast"
import { useProducts } from "@/lib/contexts/product-context"
import { useSpecialties } from "@/lib/contexts/specialty-context"
import type { Task } from "@/types/product" // Assuming Task type is defined in types/product
import { formatCurrency } from "@/lib/utils"
import PageHeader from "@/components/page-header"

type Question = {
  id: string
  question: string
  type: "text" | "multiline" | "select" | "multiselect" | "file"
  required: boolean
  aiAssisted: boolean
  allowsAttachment: boolean
  exampleAnswer?: string
  options?: string[] // Added options for select/multiselect types
}

interface TaskStep {
  id: string
  name: string
  description: string
  specialty: string // This should likely be specialtyId to link to the specialties context
  leader: string
  area: string
  estimatedHours: number
  order: number
  canRunInParallel: boolean
  experienceLevel?: string
  // Added from existing code
  calculatedCost: number
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
  id: string
  name: string
  description: string | undefined
  category: string
  isActive: boolean
  tasks: Task[]
  createdAt: string
  updatedAt: string
  totalTasksCost: number
  qualificationFee: number
  subtotal: number
  taxes: number
  operationalFee: number
  partnerCommission: number
  finalPrice: number
  price: number
  deliveryDays: number
  productImagePreview?: string
  deliveryVideoUrl?: string
  presentation?: string
  benefits?: string
  information?: string
  descriptionAttention?: string
  summaryDescription?: string
  includedItems?: string[]
  notIncludedItems?: string[]
  complementaryProducts?: string[]
  requestAttention?: string
  oneTimeContract?: string
  monthlyContract?: string
  previousContracts?: string
  status: string
  associatedTaskModels?: string[]
  recurrence?: string
  subcategories?: string[]
  tags?: string[]
  questions?: Question[]
  additionalImages?: string[]
  variations?: Array<{ id: string; label: string; quantity: number; priceModifier: number }>
  addOns?: Array<{ id: string; name: string; price: number; category: "creative_type" | "extra" }>
  questionnaire?: {
    title: string
    description: string
    questions: Question[]
  }
  // Add other fields from Product type if they exist
}

// Define Questionnaire type as it was undeclared
type Questionnaire = {
  title: string
  description: string
  questions: Question[]
}

// Mock default tax rates, assuming these are defined elsewhere or constants
const DEFAULT_TAX_RATES = {
  QUALIFICATION_FEE: 0.15, // 15%
  TAXES: 0.05, // 5%
  OPERATIONAL_FEE: 0.03, // 3%
}

export default function AdminProdutosPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts()
  const { specialties } = useSpecialties()
  const { toast } = useToast()

  // Modified useState for filters and added view mode state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterArea, setFilterArea] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false) // Renamed from isCreateOpen
  const [isViewModalOpen, setIsViewModalOpen] = useState(false) // New state for view modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null)

  const [importMode, setImportMode] = useState<"linked" | "copy" | null>(null)
  const [selectedTemplateToImport, setSelectedTemplateToImport] = useState<any>(null)
  const [showImportModeDialog, setShowImportModeDialog] = useState(false)
  const [showImportTemplateModal, setShowImportTemplateModal] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])

  const [showScheduling, setShowScheduling] = useState(false)
  const [activationDate, setActivationDate] = useState("")
  const [deactivationDate, setDeactivationDate] = useState("")

  const [customTagInput, setCustomTagInput] = useState("")
  const [priceEditPassword, setPriceEditPassword] = useState("")
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [additionalImages, setAdditionalImages] = useState<string[]>([])
  const [productQuestions, setProductQuestions] = useState<Question[]>([])
  const [productTasks, setProductTasks] = useState<Task[]>([]) // State to hold tasks for the product form

  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false)
  const [currentFieldEnhancing, setCurrentFieldEnhancing] = useState<string | null>(null)

  const [productVariations, setProductVariations] = useState<
    Array<{
      id: string
      label: string
      quantity: number
      priceModifier: number
    }>
  >([])

  const [productAddOns, setProductAddOns] = useState<
    Array<{
      id: string
      name: string
      price: number
      category: "creative_type" | "extra"
    }>
  >([])

  const [toggleConfirmation, setToggleConfirmation] = useState<{
    product: Product | null
    newStatus: boolean
  }>({ product: null, newStatus: false })

  // Mock formData for the updates, this would typically be managed by a form context or hook
  const [productFormData, setProductFormData] = useState<{
    [key: string]: any
    productId: string
    name: string
    category: string
    subcategories: string[]
    tags: string[]
    recurrence: string
    price: string
    deliveryDays: string
    isActive: boolean
    productImage: File | null
    productImagePreview: string
    presentation: string
    deliveryVideoUrl: string
    benefits: string
    information: string
    descriptionAttention: string
    summaryDescription: string
    includedItems: string[]
    notIncludedItems: string[]
    complementaryProducts: string[]
    requestAttention: string
    oneTimeContract: string
    monthlyContract: string
    previousContracts: string
    status: string
    associatedTaskModels: string[]
    description: string
    mainImage: string
    videoUrl: string
    deadline: string
    questionnaire: Array<{ id: string; question: string; type: string; required: boolean }>
    tasks: Task[]
    excludedItems: string[]
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
  })

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
  ]

  const availableSubcategories = ["Social Media", "Blog", "Vídeo", "E-mail Marketing", "SEO", "Copywriting"]

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesArea =
        filterArea === "all" || product.tasks.some((task) => task.steps.some((step) => step.area === filterArea))

      const matchesCategory = filterCategory === "all" || product.category === filterCategory

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && product.isActive) ||
        (filterStatus === "inactive" && !product.isActive)

      return matchesSearch && matchesArea && matchesCategory && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "price-asc":
          return (a.finalPrice || 0) - (b.finalPrice || 0)
        case "price-desc":
          return (b.finalPrice || 0) - (a.finalPrice || 0)
        case "id":
          return a.id.localeCompare(b.id)
        default:
          return 0
      }
    })

  const uniqueAreas = Array.from(
    new Set(products.flatMap((p) => p.tasks.flatMap((t) => t.steps.map((s) => s.area)))),
  ).filter(Boolean)

  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)))

  const getTotalHours = (product: Product) => {
    return product.tasks.reduce((total, task) => {
      return total + task.steps.reduce((taskTotal, step) => taskTotal + step.estimatedHours, 0)
    }, 0)
  }

  // Updated badge colors for dependency statuses
  const getDependencyBadgeColor = (dependencies: string[]) => {
    if (dependencies.length === 0) return "bg-gray-100 text-gray-800"
    if (dependencies.length === 1) return "bg-yellow-100 text-yellow-800"
    return "bg-orange-100 text-orange-800"
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
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
      notIncludedItems: (product as any).notIncludedItems || [], // Assuming notIncludedItems is also an array of strings
    })
    setAdditionalImages((product as any).additionalImages || [])
    setProductQuestions((product as any).questions || [])
    setProductVariations(product.variations || [])
    setProductAddOns(product.addOns || [])
    setProductTasks(product.tasks || []) // Set tasks for the product form
    setIsProductSheetOpen(true)
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsViewModalOpen(true) // Now opens the view modal
  }

  const handleDeleteProduct = async (productId: string) => {
    // Implement deletion logic here, e.g., show a confirmation dialog
    if (!confirm("Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.")) return

    try {
      await deleteProduct(productId)
      // Optionally show a success message
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      })
    }
  }

  const calculateAutomaticPrice = () => {
    const tasksTotal = (productFormData.tasks || []).reduce((total, task) => {
      return total + (task.automaticValue || 0)
    }, 0)

    return tasksTotal
  }

  const calculateStepValue = (specialtyId: string, hours: number): number => {
    if (!specialtyId || !hours) return 0

    const specialty = specialties.find((s) => s.id.toString() === specialtyId.toString())
    if (!specialty) return 0

    // Use the highest level (senior) rate as specified
    const seniorRate = specialty.rates.senior
    return seniorRate * hours
  }

  const calculateTaskValue = (steps: TaskStep[]): number => {
    if (!steps || steps.length === 0) return 0

    return steps.reduce((total, step) => {
      const stepValue = calculateStepValue(step.specialty, step.estimatedHours || 0)
      return total + stepValue
    }, 0)
  }

  const handleAIEnhance = async (fieldName: string, currentText: string) => {
    setIsEnhancingWithAI(true)
    setCurrentFieldEnhancing(fieldName)

    // Simulate AI processing
    setTimeout(() => {
      const enhancedText = `${currentText}\n\n[Texto melhorado pela IA: Conteúdo expandido com melhor estrutura e clareza.]`

      setProductFormData({
        ...productFormData,
        [fieldName]: enhancedText,
      })

      setIsEnhancingWithAI(false)
      setCurrentFieldEnhancing(null)
    }, 2000)
  }

  const handleCreateProduct = () => {
    console.log("[v0] Creating new product:", productFormData)

    if (!productFormData.name.trim()) {
      alert("Por favor, preencha o nome do produto")
      return
    }

    if (!productFormData.category.trim()) {
      alert("Por favor, selecione uma categoria")
      return
    }

    const generatedId = `PROD-${Date.now().toString().slice(-6)}`

    const newProductWithDefaults: Product = {
      id: generatedId,
      name: productFormData.name,
      description: productFormData.summaryDescription || productFormData.benefits,
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
      finalPrice: Number.parseFloat(productFormData.price) || calculateAutomaticPrice(),
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
      // Ensure tasks from form are included
      tasks: productTasks,
      // Questionnaire should be part of the product data if managed
      questionnaire: {
        title: "Questionário do Produto", // Placeholder title
        description: "Respostas do cliente para configurar o produto.", // Placeholder description
        questions: productQuestions,
      },
    }

    addProduct(newProductWithDefaults)

    resetProductForm()
    setIsProductSheetOpen(false)
  }

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
    })
    setAdditionalImages([])
    setProductQuestions([])
    setCustomTagInput("")
    // Resetting customization options
    setProductVariations([])
    setProductAddOns([])
    setProductTasks([]) // Reset tasks
  }

  const handleOpenProductSheet = () => {
    console.log("[v0] Opening product creation sheet")
    resetProductForm()
    setSelectedProduct(null) // Ensure we are in create mode
    setIsProductSheetOpen(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProductFormData({
        ...productFormData,
        productImage: file,
        productImagePreview: URL.createObjectURL(file),
      })
    }
  }

  const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
      setAdditionalImages([...additionalImages, ...newImages])
    }
  }

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault()
      if (!productFormData.tags.includes(customTagInput.trim())) {
        setProductFormData({
          ...productFormData,
          tags: [...productFormData.tags, customTagInput.trim()],
        })
      }
      setCustomTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setProductFormData({
      ...productFormData,
      tags: productFormData.tags.filter((t) => t !== tag),
    })
  }

  const toggleSubcategory = (subcategory: string) => {
    setProductFormData({
      ...productFormData,
      subcategories: productFormData.subcategories.includes(subcategory)
        ? productFormData.subcategories.filter((s) => s !== subcategory)
        : [...productFormData.subcategories, subcategory],
    })
  }

  const handleEditPrice = () => {
    setShowPasswordModal(true)
  }

  const handlePasswordSubmit = () => {
    if (priceEditPassword === "123") {
      setShowPasswordModal(false)
      setPriceEditPassword("")
      // Price input is now editable
      const priceInput = document.querySelector('input[value*="R$"]') as HTMLInputElement
      if (priceInput) {
        priceInput.removeAttribute("readOnly")
        priceInput.classList.remove("bg-green-50", "dark:bg-green-950/20")
        priceInput.classList.add("bg-white", "dark:bg-background")
        priceInput.focus()
      }
    } else {
      alert("Senha incorreta!")
      setPriceEditPassword("")
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question: "",
      type: "text",
      required: false,
      aiAssisted: false,
      allowsAttachment: false,
      options: [], // Initialize options
    }
    setProductQuestions([...productQuestions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setProductQuestions(productQuestions.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const removeQuestion = (id: string) => {
    setProductQuestions(productQuestions.filter((q) => q.id !== id))
  }

  const addVariation = () => {
    const newVariation = {
      id: `var-${Date.now()}`,
      label: "",
      quantity: 1,
      priceModifier: 0,
    }
    setProductVariations([...productVariations, newVariation])
  }

  const updateVariation = (id: string, updates: Partial<(typeof productVariations)[0]>) => {
    setProductVariations(productVariations.map((v) => (v.id === id ? { ...v, ...updates } : v)))
  }

  const removeVariation = (id: string) => {
    setProductVariations(productVariations.filter((v) => v.id !== id))
  }

  const addAddOn = () => {
    const newAddOn = {
      id: `addon-${Date.now()}`,
      name: "",
      price: 0,
      category: "extra" as const,
    }
    setProductAddOns([...productAddOns, newAddOn])
  }

  const updateAddOn = (id: string, updates: Partial<(typeof productAddOns)[0]>) => {
    setProductAddOns(productAddOns.map((a) => (a.id === id ? { ...a, ...updates } : a)))
  }

  const removeAddOn = (id: string) => {
    setProductAddOns(productAddOns.filter((a) => a.id !== id))
  }

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
      })
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      })
    } else {
      // Create new product
      // Call handleCreateProduct which already has the logic for new products
      handleCreateProduct()
      toast({
        title: "Sucesso",
        description: "Produto criado com sucesso!",
      })
    }
    setIsProductSheetOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setSelectedProduct(null)
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
    })
    setAdditionalImages([])
    setProductQuestions([])
    setProductVariations([])
    setProductAddOns([])
    setProductTasks([]) // Reset tasks as well
  }

  const handleSaveDraft = () => {
    console.log("[v0] Saving draft:", productFormData)
    if (!productFormData.name.trim()) {
      alert("Por favor, preencha pelo menos o nome do produto")
      return
    }

    const generatedId = `PROD-${Date.now().toString().slice(-6)}`

    const draftProduct: Product = {
      id: generatedId,
      name: productFormData.name,
      description: productFormData.summaryDescription || productFormData.benefits || "Rascunho",
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
      // Ensure draft includes tasks and questionnaire
      tasks: productTasks,
      questionnaire: {
        title: "Rascunho Questionário",
        description: "Questionário para configurar o produto.",
        questions: productQuestions,
      },
    }

    addProduct(draftProduct)
    resetProductForm()
    setIsProductSheetOpen(false)
  }

  const handleScheduleLaunch = () => {
    console.log("[v0] Scheduling product launch:", {
      product: productFormData,
      activationDate,
      deactivationDate,
    })

    if (!activationDate) {
      alert("Por favor, defina a data de ativação")
      return
    }

    // Here you would likely want to call handleSaveProduct() first,
    // then potentially set the activation/deactivation dates on the product
    // or queue it for a scheduled activation.
    // For now, we'll assume handleCreateProduct or handleUpdateProduct is called within handleSaveProduct.
    handleSaveProduct() // Ensure product is saved first

    // Then handle scheduling logic
    // ... (actual scheduling logic would go here)

    setShowScheduling(false)
    setActivationDate("")
    setDeactivationDate("")
  }

  const handleImportTemplate = (template: any) => {
    setSelectedTemplateToImport(template)
    setShowImportModeDialog(true)
    setShowImportTemplateModal(false)
  }

  // Updated confirmImportTemplate to use productFormData for tasks
  const confirmImportTemplate = (mode: "linked" | "copy") => {
    if (!selectedTemplateToImport) return

    const newTask: Task = {
      id: Date.now().toString(),
      code: mode === "linked" ? selectedTemplateToImport.id : `AUTO-GERADO-${Date.now()}`,
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
    }

    setProductFormData({
      ...productFormData,
      tasks: [...(productFormData.tasks || []), newTask],
    })

    setShowImportModeDialog(false)
    setSelectedTemplateToImport(null)
  }

  // Renamed to toggleConfirmation for clarity
  const handleToggleProductStatus = (product: Product, newStatus: boolean) => {
    console.log("[v0] Toggle clicked:", {
      productId: product.id,
      productName: product.name,
      currentStatus: product.isActive,
      newStatus,
    })
    setToggleConfirmation({ product, newStatus })
  }

  const confirmToggleStatus = async () => {
    if (!toggleConfirmation.product) return

    console.log("[v0] Confirming toggle:", {
      productId: toggleConfirmation.product.id,
      productName: toggleConfirmation.product.name,
      newStatus: toggleConfirmation.newStatus,
    })

    try {
      // Call updateProduct with (id, product) signature
      await updateProduct(toggleConfirmation.product.id, {
        ...toggleConfirmation.product,
        isActive: toggleConfirmation.newStatus,
        updatedAt: new Date().toISOString(),
      })

      console.log("[v0] Toggle success:", {
        productId: toggleConfirmation.product.id,
        newStatus: toggleConfirmation.newStatus,
      })

      toast({
        title: "Sucesso",
        description: `Produto ${toggleConfirmation.newStatus ? "ativado" : "desativado"} com sucesso`,
      })
    } catch (error) {
      console.error("[v0] Toggle error:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do produto",
        variant: "destructive",
      })
    } finally {
      setToggleConfirmation({ product: null, newStatus: false })
    }
  }

  // Calculate active filters count for display
  const activeFiltersCount = [
    filterArea !== "all",
    filterCategory !== "all",
    filterStatus !== "all",
    searchTerm !== "",
  ].filter(Boolean).length

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
        <AccordionItem value="stats" className="border rounded-lg bg-blue-50 border-blue-200">
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
                      <p className="text-2xl font-bold mt-0.5">{products.length}</p>
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
                        {products.reduce((sum, p) => sum + (p.tasks || []).length, 0)}
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
                        {products.reduce((sum, p) => sum + getTotalHours(p), 0)}h
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
                        {formatCurrency(products.reduce((sum, p) => sum + (p.finalPrice || 0), 0))}
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

      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  size="sm"
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none h-8 px-3"
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none h-8 px-3"
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Categoria</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {uniqueCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Área</Label>
                  <Select value={filterArea} onValueChange={setFilterArea}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Áreas</SelectItem>
                      {uniqueAreas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ordenar por</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nome (A-Z)</SelectItem>
                      <SelectItem value="id">ID</SelectItem>
                      <SelectItem value="price-asc">Preço (Menor)</SelectItem>
                      <SelectItem value="price-desc">Preço (Maior)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="sm:col-span-2 xl:col-span-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("")
                        setFilterArea("all")
                        setFilterCategory("all")
                        setFilterStatus("all")
                      }}
                      size="sm"
                      className="gap-2 h-8"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchTerm || activeFiltersCount > 0
                ? "Tente ajustar os filtros ou busca para encontrar o que procura."
                : "Comece criando seu primeiro produto para gerenciar seu catálogo."}
            </p>
            <Button onClick={handleOpenProductSheet} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group hover:shadow-md transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                        <CardDescription className="line-clamp-1">{product.description}</CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-normal">
                        {product.category}
                      </Badge>
                      <Badge variant={product.isActive ? "default" : "secondary"} className="font-normal">
                        {product.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(product.finalPrice || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                            product.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-50 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <Power
                            className={`h-3.5 w-3.5 ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}
                          />
                          <span className="text-xs font-medium">{product.isActive ? "Ativo" : "Inativo"}</span>
                        </div>
                        <Switch
                          checked={product.isActive}
                          onCheckedChange={(checked) => handleToggleProductStatus(product, checked)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>

                      <TooltipProvider>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewProduct(product)}
                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
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
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar produto</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Product stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{product.tasks.length} tarefas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{getTotalHours(product)}h</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product)
                      setIsPricingModalOpen(true)
                    }}
                    className="ml-auto h-8 text-xs gap-1"
                  >
                    <Calculator className="h-3 w-3" />
                    Ver Cálculo
                  </Button>
                </div>

                {/* Tasks accordion */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="tasks" className="border-0">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Layers className="h-4 w-4" />
                        Tarefas e Etapas ({product.tasks.length})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="space-y-2 pt-2">
                        {(product.tasks || []).map((task, index) => (
                          <div key={task.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <h4 className="font-semibold">{task.name}</h4>
                                  {task.canRunInParallel && (
                                    <Badge variant="outline" className="text-xs">
                                      Paralela
                                    </Badge>
                                  )}
                                  <Badge className="text-xs bg-green-100 text-green-800">
                                    {formatCurrency(task.calculatedCost)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 ml-8">{task.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task)
                                  setIsTaskModalOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>

                            {task.dependencies.length > 0 && (
                              <div className="flex items-center gap-4 text-sm ml-8">
                                <Badge className={`text-xs ${getDependencyBadgeColor(task.dependencies)}`}>
                                  Depende de {task.dependencies.length} tarefa(s)
                                </Badge>
                              </div>
                            )}

                            <div className="ml-8 space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">
                                Etapas ({(task.steps || []).length}):
                              </div>
                              <div className="space-y-2">
                                {(task.steps || []).map((step) => {
                                  const specialty = specialties.find((s) => s.id === step.specialty)
                                  return (
                                    <div
                                      key={step.id}
                                      className="flex items-center justify-between p-2 bg-background rounded border"
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="text-xs font-semibold text-muted-foreground">
                                          {step.order}.
                                        </span>
                                        <span className="text-sm">{step.name}</span>
                                        {specialty && (
                                          <Badge variant="outline" className="text-xs">
                                            {specialty.name}
                                          </Badge>
                                        )}
                                        {step.experienceLevel && (
                                          <Badge variant="secondary" className="text-xs">
                                            {step.experienceLevel}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">{step.estimatedHours}h</span>
                                        <span className="text-xs font-semibold text-green-600">
                                          {formatCurrency(step.calculatedCost)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {task.questionnaire && (
                              <div className="ml-8 pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-transparent"
                                  onClick={() => {
                                    setSelectedQuestionnaire(task.questionnaire)
                                    setIsQuestionnaireModalOpen(true)
                                  }}
                                >
                                  <FileQuestion className="h-3 w-3 mr-1" />
                                  Ver Questionário ({task.questionnaire.questions.length} perguntas)
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ConfirmationDialog for toggling product status */}
      <ConfirmationDialog
        open={toggleConfirmation.product !== null}
        onClose={() => setToggleConfirmation({ product: null, newStatus: false })}
        onConfirm={confirmToggleStatus}
        title={toggleConfirmation.newStatus ? "Ativar Produto" : "Desativar Produto"}
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
            <DialogDescription>Digite a senha de administrador para editar o preço do produto</DialogDescription>
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
              O preço é calculado automaticamente com base nas tarefas, especialidades e custos. Apenas administradores
              podem editá-lo manualmente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasswordSubmit}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      <Dialog open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cálculo Detalhado de Preço
            </DialogTitle>
            <DialogDescription>Breakdown completo dos custos e margens do produto</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                </div>

                {/* Tasks and Steps Costs */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Custos por Tarefa e Etapa</Label>
                  {(selectedProduct.tasks || []).map((task, taskIndex) => (
                    <div key={task.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                            {task.order || taskIndex + 1}
                          </span>
                          <span className="font-medium">{task.name}</span>
                        </div>
                        <span className="font-semibold text-green-600">{formatCurrency(task.calculatedCost)}</span>
                      </div>
                      <div className="ml-8 space-y-2">
                        {(task.steps || []).map((step) => {
                          const specialty = specialties.find((s) => s.id === step.specialty)
                          const hourlyRate =
                            specialty && step.experienceLevel ? specialty.rates[step.experienceLevel] : 0

                          return (
                            <div
                              key={step.id}
                              className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs text-muted-foreground">{step.order}.</span>
                                <span>{step.name}</span>
                                {specialty && (
                                  <Badge variant="outline" className="text-xs">
                                    {specialty.name}
                                  </Badge>
                                )}
                                {step.experienceLevel && (
                                  <Badge variant="secondary" className="text-xs">
                                    {step.experienceLevel}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {step.estimatedHours}h × {formatCurrency(hourlyRate)} ={" "}
                                {formatCurrency(step.calculatedCost)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing Breakdown */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-semibold">Breakdown de Preço</Label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <span className="text-sm">Custo Total das Tarefas (Nômades)</span>
                      <span className="font-semibold">{formatCurrency(selectedProduct.totalTasksCost)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Taxa de Qualificação</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.QUALIFICATION_FEE * 100).toFixed(0)}% sobre custos
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(selectedProduct.qualificationFee)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <span className="text-sm font-semibold">Subtotal</span>
                      <span className="font-bold text-lg">{formatCurrency(selectedProduct.subtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Impostos</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.TAXES * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(selectedProduct.taxes)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Taxa Operacional</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.OPERATIONAL_FEE * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(selectedProduct.operationalFee)}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-100 dark:bg-green-950 rounded-lg border-2 border-green-500">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-base font-bold">Preço Final</span>
                      </div>
                      <span className="font-bold text-2xl text-green-600">
                        {formatCurrency(selectedProduct.finalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingModalOpen(false)}>
              Fechar
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Editar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Detalhes da Tarefa
            </DialogTitle>
            <DialogDescription>Informações completas sobre a tarefa</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedTask.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    Custo Total: {formatCurrency(selectedTask.calculatedCost)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Execução Paralela</Label>
                    <p className="font-medium">{selectedTask.canRunInParallel ? "Sim" : "Não"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total de Horas</Label>
                    <p className="font-medium">
                      {selectedTask.steps.reduce((sum, step) => sum + step.estimatedHours, 0)}h
                    </p>
                  </div>
                </div>

                {selectedTask.dependencies.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Dependências</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Esta tarefa depende da conclusão de {selectedTask.dependencies.length} tarefa(s) anterior(es)
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold mb-3 block">Etapas da Tarefa</Label>
                  <div className="space-y-3">
                    {selectedTask.steps.map((step) => {
                      const specialty = specialties.find((s) => s.id === step.specialty)
                      const hourlyRate = specialty && step.experienceLevel ? specialty.rates[step.experienceLevel] : 0

                      return (
                        <div key={step.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                            {step.order}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{step.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {specialty && (
                                <Badge variant="outline" className="text-xs">
                                  {specialty.name}
                                </Badge>
                              )}
                              {step.experienceLevel && (
                                <Badge variant="secondary" className="text-xs">
                                  {step.experienceLevel}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{step.estimatedHours}h</span>
                              </div>
                              <span className="text-xs font-semibold text-green-600">
                                {step.estimatedHours}h × {formatCurrency(hourlyRate)} ={" "}
                                {formatCurrency(step.calculatedCost)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {selectedTask.questionnaire && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Questionário Associado</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuestionnaire(selectedTask.questionnaire)
                          setIsQuestionnaireModalOpen(true)
                        }}
                      >
                        Ver Completo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium">{selectedTask.questionnaire.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{selectedTask.questionnaire.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        {selectedTask.questionnaire.questions.length} perguntas
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Fechar
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Editar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questionnaire Modal */}
      <Dialog open={isQuestionnaireModalOpen} onOpenChange={setIsQuestionnaireModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Questionário para Cliente/Agência
            </DialogTitle>
            <DialogDescription>Questionário que será respondido antes do início da tarefa</DialogDescription>
          </DialogHeader>

          {selectedQuestionnaire && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{selectedQuestionnaire.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedQuestionnaire.description}</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Perguntas ({selectedQuestionnaire.questions.length})</Label>
                  {selectedQuestionnaire.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{question.question}</p>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">
                                Obrigatória
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {question.type === "text" && "Texto curto"}
                              {question.type === "multiline" && "Texto longo"}
                              {question.type === "select" && "Seleção única"}
                              {question.type === "multiselect" && "Múltipla escolha"}
                              {question.type === "file" && "Upload de arquivo"}
                            </Badge>
                            {question.aiAssisted && (
                              <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                                <Sparkles className="h-3 w-3 mr-1" />
                                IA Assistida
                              </Badge>
                            )}
                          </div>
                          {question.options && question.options.length > 0 && (
                            <div className="mt-3 pl-4 border-l-2 border-muted">
                              <p className="text-xs text-muted-foreground mb-2">Opções:</p>
                              <div className="space-y-1">
                                {question.options.map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                                    {option}
                                  </div>
                                ))}
                              </div>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionnaireModalOpen(false)}>
              Fechar
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Editar Questionário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* <ImportTaskTemplateModal
        open={showImportTemplateModal}
        onClose={() => setShowImportTemplateModal(false)}
        onImport={handleImportTemplate}
      /> */}

      {/* Modernized import mode dialog with better styling and layout */}
      <Dialog open={showImportModeDialog} onOpenChange={setShowImportModeDialog}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Como deseja importar o modelo?
            </DialogTitle>
            <DialogDescription>
              Escolha se deseja vincular ao modelo original ou criar uma cópia independente
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-3">
            <button
              onClick={() => {
                setImportMode("linked")
                setShowImportModeDialog(false)
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
                    code: selectedTemplateToImport.code || `LINKED-${selectedTemplateToImport.id}`,
                    specialty: selectedTemplateToImport.specialty || "",
                    executionTime: selectedTemplateToImport.executionTime || 0,
                    executionDeadline: selectedTemplateToImport.executionDeadline || 0,
                    deliveryDeadline: selectedTemplateToImport.deliveryDeadline || 0,
                    adjustmentDeadline: selectedTemplateToImport.adjustmentDeadline || 0,
                    approvalDeadline: selectedTemplateToImport.approvalDeadline || 0,
                    automaticValue: selectedTemplateToImport.automaticValue || 0,
                    attentionText: selectedTemplateToImport.attentionText || "",
                    pop: selectedTemplateToImport.pop || "",
                    complementaryFiles: selectedTemplateToImport.complementaryFiles || [],
                    verificationItems: selectedTemplateToImport.verificationItems || [],
                    keepNextStepWithNomadLeader: selectedTemplateToImport.keepNextStepWithNomadLeader || false,
                    delegateToLeader: selectedTemplateToImport.delegateToLeader || false,
                    liberateAfterSend: selectedTemplateToImport.liberateAfterSend || false,
                    requireFinalFiles: selectedTemplateToImport.requireFinalFiles || false,
                    isInternalStep: selectedTemplateToImport.isInternalStep || false,
                    concludeOnRejection: selectedTemplateToImport.concludeOnRejection || false,
                    hideFromClient: selectedTemplateToImport.hideFromClient || false,
                    hasVariations: selectedTemplateToImport.hasVariations || false,
                    noConditions: selectedTemplateToImport.noConditions || false,
                    showAccess: selectedTemplateToImport.showAccess || false,
                    hideInProducts: selectedTemplateToImport.hideInProducts || false,
                    dontCountDeadline: selectedTemplateToImport.dontCountDeadline || false,
                    dontCountValue: selectedTemplateToImport.dontCountValue || false,
                    hasAdditionals: selectedTemplateToImport.hasAdditionals || false,
                    calculatedCost: selectedTemplateToImport.calculatedCost || 0,
                    dependencies: selectedTemplateToImport.dependencies || [],
                  }
                  setProductFormData({
                    ...productFormData,
                    tasks: [...(productFormData.tasks || []), newTask],
                  })
                  setSelectedTemplateToImport(null)
                }
              }}
              className="w-full p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Vincular ao Modelo Original</h4>
                  <p className="text-xs text-muted-foreground">
                    As alterações feitas no modelo original serão refletidas automaticamente neste produto
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setImportMode("copy")
                setShowImportModeDialog(false)
                if (selectedTemplateToImport) {
                  // Import as copy
                  const newTask: Task = {
                    id: Date.now().toString(),
                    name: `${selectedTemplateToImport.name} (Cópia)`,
                    description: selectedTemplateToImport.description,
                    templateId: null, // No template link for copy
                    isLinkedToTemplate: false,
                    order: (productFormData.tasks || []).length + 1,
                    canRunInParallel: selectedTemplateToImport.canRunInParallel || false, // Use existing default or template value
                    // Replicate other fields from template if needed, or set defaults
                    steps: selectedTemplateToImport.steps || [], // Copy steps as well
                    code: `COPY-${Date.now().toString().slice(-6)}`, // Auto-generated code for copy
                    specialty: selectedTemplateToImport.specialty || "",
                    executionTime: selectedTemplateToImport.executionTime || 0,
                    executionDeadline: selectedTemplateToImport.executionDeadline || 0,
                    deliveryDeadline: selectedTemplateToImport.deliveryDeadline || 0,
                    adjustmentDeadline: selectedTemplateToImport.adjustmentDeadline || 0,
                    approvalDeadline: selectedTemplateToImport.approvalDeadline || 0,
                    automaticValue: selectedTemplateToImport.automaticValue || 0,
                    attentionText: selectedTemplateToImport.attentionText || "",
                    pop: selectedTemplateToImport.pop || "",
                    complementaryFiles: selectedTemplateToImport.complementaryFiles || [],
                    verificationItems: selectedTemplateToImport.verificationItems || [],
                    keepNextStepWithNomadLeader: selectedTemplateToImport.keepNextStepWithNomadLeader || false,
                    delegateToLeader: selectedTemplateToImport.delegateToLeader || false,
                    liberateAfterSend: selectedTemplateToImport.liberateAfterSend || false,
                    requireFinalFiles: selectedTemplateToImport.requireFinalFiles || false,
                    isInternalStep: selectedTemplateToImport.isInternalStep || false,
                    concludeOnRejection: selectedTemplateToImport.concludeOnRejection || false,
                    hideFromClient: selectedTemplateToImport.hideFromClient || false,
                    hasVariations: selectedTemplateToImport.hasVariations || false,
                    noConditions: selectedTemplateToImport.noConditions || false,
                    showAccess: selectedTemplateToImport.showAccess || false,
                    hideInProducts: selectedTemplateToImport.hideInProducts || false,
                    dontCountDeadline: selectedTemplateToImport.dontCountDeadline || false,
                    dontCountValue: selectedTemplateToImport.dontCountValue || false,
                    hasAdditionals: selectedTemplateToImport.hasAdditionals || false,
                    calculatedCost: selectedTemplateToImport.calculatedCost || 0,
                    dependencies: selectedTemplateToImport.dependencies || [],
                  }
                  setProductFormData({
                    ...productFormData,
                    tasks: [...(productFormData.tasks || []), newTask],
                  })
                  setSelectedTemplateToImport(null)
                }
              }}
              className="w-full p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Criar Cópia Independente</h4>
                  <p className="text-xs text-muted-foreground">
                    Criar uma cópia que pode ser editada livremente sem afetar o modelo original
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-end px-6 py-4 border-t">
            <Button variant="ghost" onClick={() => setShowImportModeDialog(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet for creating/editing products */}
      <Sheet open={isProductSheetOpen} onOpenChange={setIsProductSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 left-[240px] flex flex-col">
          <div className="px-6 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500 shadow-md">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    {selectedProduct ? "Editar Produto" : "Criar Novo Produto"} {/* Dynamic title */}
                  </h2>
                  <p className="text-xs text-muted-foreground">Preencha as informações abaixo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Tabs defaultValue="info" className="space-y-3">
                <TabsList className="w-full justify-start bg-muted/50 p-1">
                  <TabsTrigger
                    value="info"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Informações
                  </TabsTrigger>
                  <TabsTrigger
                    value="apresentacao"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Apresentação
                  </TabsTrigger>
                  <TabsTrigger
                    value="descricao"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Descrição
                  </TabsTrigger>
                  <TabsTrigger
                    value="solicitar"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Solicitação
                  </TabsTrigger>
                  <TabsTrigger
                    value="tarefas"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Tarefas
                  </TabsTrigger>
                  <TabsTrigger
                    value="customizacao"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Opções
                  </TabsTrigger>
                  <TabsTrigger
                    value="questionario"
                    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-xs"
                  >
                    Questionário
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">ID do Produto</Label>
                      <Input
                        value={
                          productFormData.productId || selectedProduct?.id || `PROD-${Date.now().toString().slice(-6)}`
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
                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Imagens do Produto</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {/* Main image */}
                      <div className="relative w-full aspect-square rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center bg-blue-50 dark:bg-blue-950/30 overflow-hidden hover:border-blue-500 transition-colors">
                        {productFormData.productImagePreview || selectedProduct?.productImagePreview ? (
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
                            <Badge className="absolute top-1 left-1 text-xs">Principal</Badge>
                          </>
                        ) : (
                          <label className="cursor-pointer w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-blue-400" />
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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
                        onValueChange={(value) => setProductFormData({ ...productFormData, category: value })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mídias e Conteúdo">Mídias e Conteúdo</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">Recorrência</Label>
                      <Select
                        value={productFormData.recurrence}
                        onValueChange={(value) => setProductFormData({ ...productFormData, recurrence: value })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Avulso">Avulso</SelectItem>
                          <SelectItem value="Mensal">Mensal</SelectItem>
                          <SelectItem value="Avulso e Mensal">Avulso e Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
                        Preço (Calculado) <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="R$ 0,00"
                          value={productFormData.price || formatCurrency(calculateAutomaticPrice())}
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
                        onChange={(e) => setProductFormData({ ...productFormData, deliveryDays: e.target.value })}
                        className="text-xs h-8"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs font-normal cursor-pointer group">
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
                    <p className="text-xs text-muted-foreground">Pressione Enter para adicionar tags.</p>
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Subcategorias</Label>
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
                        .filter((sub) => !productFormData.subcategories.includes(sub))
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
                      onChange={(e) => setProductFormData({ ...productFormData, deliveryVideoUrl: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Texto de Apresentação</Label>
                    <Textarea
                      placeholder="Descreva o que o produto faz e seus principais benefícios."
                      value={productFormData.presentation}
                      onChange={(e) => setProductFormData({ ...productFormData, presentation: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Benefícios Chave</Label>
                    <Textarea
                      placeholder="Liste os principais benefícios do produto para o cliente."
                      value={productFormData.benefits}
                      onChange={(e) => setProductFormData({ ...productFormData, benefits: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Informações Adicionais</Label>
                    <Textarea
                      placeholder="Informações técnicas ou de uso que não se encaixam em outras seções."
                      value={productFormData.information}
                      onChange={(e) => setProductFormData({ ...productFormData, information: e.target.value })}
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
                      onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                      className="text-xs min-h-[150px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Atenção na Descrição</Label>
                    <Textarea
                      placeholder="Qualquer informação importante que o cliente deve saber antes de comprar."
                      value={productFormData.descriptionAttention}
                      onChange={(e) => setProductFormData({ ...productFormData, descriptionAttention: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Resumo da Descrição</Label>
                    <Textarea
                      placeholder="Um resumo conciso para listagens rápidas ou prévias."
                      value={productFormData.summaryDescription}
                      onChange={(e) => setProductFormData({ ...productFormData, summaryDescription: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Itens Inclusos</Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.includedItems.map((item, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-normal cursor-pointer group">
                          {item}
                          <button
                            onClick={() =>
                              setProductFormData({
                                ...productFormData,
                                includedItems: productFormData.includedItems.filter((_, i) => i !== index),
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
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            e.preventDefault()
                            setProductFormData({
                              ...productFormData,
                              includedItems: [...productFormData.includedItems, e.currentTarget.value.trim()],
                            })
                            e.currentTarget.value = ""
                          }
                        }}
                        className="h-7 w-auto text-xs border-dashed flex-grow"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Itens Não Inclusos</Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.notIncludedItems.map((item, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-normal cursor-pointer group">
                          {item}
                          <button
                            onClick={() =>
                              setProductFormData({
                                ...productFormData,
                                notIncludedItems: productFormData.notIncludedItems.filter((_, i) => i !== index),
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
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            e.preventDefault()
                            setProductFormData({
                              ...productFormData,
                              notIncludedItems: [...productFormData.notIncludedItems, e.currentTarget.value.trim()],
                            })
                            e.currentTarget.value = ""
                          }
                        }}
                        className="h-7 w-auto text-xs border-dashed flex-grow"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="solicitar" className="space-y-3 mt-3">
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">O que solicitar para o cliente?</Label>
                    <Textarea
                      placeholder="Ex: Arquivo com o logo em vetor, Briefing detalhado, etc."
                      value={productFormData.requestAttention}
                      onChange={(e) => setProductFormData({ ...productFormData, requestAttention: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Contrato de Pagamento Único</Label>
                    <Textarea
                      placeholder="Termos específicos para pagamentos únicos."
                      value={productFormData.oneTimeContract}
                      onChange={(e) => setProductFormData({ ...productFormData, oneTimeContract: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Contrato Mensal</Label>
                    <Textarea
                      placeholder="Termos específicos para contratos mensais."
                      value={productFormData.monthlyContract}
                      onChange={(e) => setProductFormData({ ...productFormData, monthlyContract: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Contratos Anteriores</Label>
                    <Textarea
                      placeholder="Informações sobre contratos prévios que este produto pode substituir ou complementar."
                      value={productFormData.previousContracts}
                      onChange={(e) => setProductFormData({ ...productFormData, previousContracts: e.target.value })}
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Itens Excluídos</Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.excludedItems.map((item, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-normal cursor-pointer group">
                          {item}
                          <button
                            onClick={() =>
                              setProductFormData({
                                ...productFormData,
                                excludedItems: productFormData.excludedItems.filter((_, i) => i !== index),
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
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            e.preventDefault()
                            setProductFormData({
                              ...productFormData,
                              excludedItems: [...productFormData.excludedItems, e.currentTarget.value.trim()],
                            })
                            e.currentTarget.value = ""
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
                      <AccordionItem key={task.id} value={task.id} className="border rounded-lg px-4 py-2">
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
                                <Label className="text-xs font-medium">Nome da Tarefa</Label>
                                <Input
                                  value={task.name}
                                  onChange={(e) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map((t, idx) =>
                                        idx === taskIndex ? { ...t, name: e.target.value } : t,
                                      ),
                                    })
                                  }
                                  className="text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Ordem</Label>
                                <Input
                                  type="number"
                                  value={task.order}
                                  onChange={(e) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map((t, idx) =>
                                        idx === taskIndex ? { ...t, order: Number.parseInt(e.target.value) } : t,
                                      ),
                                    })
                                  }
                                  className="text-xs h-8 w-20"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Descrição</Label>
                              <Textarea
                                value={task.description}
                                onChange={(e) =>
                                  setProductFormData({
                                    ...productFormData,
                                    tasks: productFormData.tasks.map((t, idx) =>
                                      idx === taskIndex ? { ...t, description: e.target.value } : t,
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
                                      tasks: productFormData.tasks.map((t, idx) =>
                                        idx === taskIndex ? { ...t, canRunInParallel: checked } : t,
                                      ),
                                    })
                                  }
                                />
                                <Label className="text-xs font-medium">Pode rodar em paralelo</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={task.isLinkedToTemplate || false} // Handle undefined
                                  onCheckedChange={(checked) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map((t, idx) =>
                                        idx === taskIndex ? { ...t, isLinkedToTemplate: checked } : t,
                                      ),
                                    })
                                  }
                                />
                                <Label className="text-xs font-medium">Vinculado a Modelo</Label>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task)
                                  setIsTaskModalOpen(true)
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
                                  tasks: productFormData.tasks.filter((_, idx) => idx !== taskIndex),
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
                      })
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Nova Tarefa
                  </Button>
                </TabsContent>

                <TabsContent value="customizacao" className="space-y-3 mt-3">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold">Variações do Produto</Label>
                    {productVariations.map((variation, index) => (
                      <div key={variation.id} className="grid grid-cols-4 gap-3 p-3 border rounded-lg">
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs font-medium">Opção de Variação</Label>
                          <Input
                            value={variation.label}
                            onChange={(e) => updateVariation(variation.id, { label: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Quantidade</Label>
                          <Input
                            type="number"
                            value={variation.quantity}
                            onChange={(e) =>
                              updateVariation(variation.id, { quantity: Number.parseInt(e.target.value) || 0 })
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
                              updateVariation(variation.id, { priceModifier: Number.parseFloat(e.target.value) || 0 })
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
                    <Button variant="outline" size="sm" onClick={addVariation} className="text-xs gap-1 bg-transparent">
                      <Plus className="h-3 w-3" />
                      Adicionar Variação
                    </Button>
                  </div>

                  <div className="space-y-4 mt-6">
                    <Label className="text-sm font-semibold">Add-ons</Label>
                    {productAddOns.map((addOn, index) => (
                      <div key={addOn.id} className="grid grid-cols-4 gap-3 p-3 border rounded-lg">
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs font-medium">Nome do Add-on</Label>
                          <Input
                            value={addOn.name}
                            onChange={(e) => updateAddOn(addOn.id, { name: e.target.value })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Preço</Label>
                          <Input
                            type="number"
                            value={addOn.price}
                            onChange={(e) => updateAddOn(addOn.id, { price: Number.parseFloat(e.target.value) || 0 })}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Categoria</Label>
                          <Select
                            value={addOn.category}
                            onValueChange={(value) =>
                              updateAddOn(addOn.id, { category: value as "creative_type" | "extra" })
                            }
                          >
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="creative_type">Tipo Criativo</SelectItem>
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
                    <Button variant="outline" size="sm" onClick={addAddOn} className="text-xs gap-1 bg-transparent">
                      <Plus className="h-3 w-3" />
                      Adicionar Add-on
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="questionario" className="space-y-3 mt-3">
                  <Label className="text-sm font-semibold">Configure o Questionário</Label>
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-medium">Título do Questionário</Label>
                    <Input
                      value={productFormData.questionnaire.title}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          questionnaire: { ...productFormData.questionnaire, title: e.target.value },
                        })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-medium">Descrição do Questionário</Label>
                    <Textarea
                      value={productFormData.questionnaire.description}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          questionnaire: { ...productFormData.questionnaire, description: e.target.value },
                        })
                      }
                      className="text-xs min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-4 mt-4">
                    <Label className="text-sm font-semibold">Perguntas</Label>
                    {productQuestions.map((question, index) => (
                      <div key={question.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="space-y-1.5 flex-1">
                              <Label className="text-xs font-medium">Pergunta</Label>
                              <Input
                                value={question.question}
                                onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                          <button onClick={() => removeQuestion(question.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Tipo de Resposta</Label>
                            <Select
                              value={question.type}
                              onValueChange={(value) =>
                                updateQuestion(question.id, { type: value as Question["type"] })
                              }
                            >
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Texto Curto</SelectItem>
                                <SelectItem value="multiline">Texto Longo</SelectItem>
                                <SelectItem value="select">Seleção Única</SelectItem>
                                <SelectItem value="multiselect">Múltipla Escolha</SelectItem>
                                <SelectItem value="file">Upload de Arquivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Opções (para seleção)</Label>
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
                              disabled={question.type !== "select" && question.type !== "multiselect"}
                            />
                          </div>

                          <div className="space-y-1.5 flex items-end">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={question.required}
                                onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                              />
                              <Label className="text-xs font-medium">Obrigatória</Label>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={question.aiAssisted}
                              onCheckedChange={(checked) => updateQuestion(question.id, { aiAssisted: checked })}
                            />
                            <Label className="text-xs font-medium">IA Assistida</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={question.allowsAttachment}
                              onCheckedChange={(checked) => updateQuestion(question.id, { allowsAttachment: checked })}
                            />
                            <Label className="text-xs font-medium">Permite Anexo</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addQuestion} className="text-xs gap-1 bg-transparent">
                      <Plus className="h-3 w-3" />
                      Adicionar Pergunta
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <SheetFooter className="flex-shrink-0 px-6 py-3 border-t">
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft}>
              Salvar Rascunho
            </Button>
            <Button onClick={handleScheduleLaunch}>Agendar Lançamento</Button>
            <Button onClick={handleSaveProduct} className="btn-brand">
              Salvar Produto
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
