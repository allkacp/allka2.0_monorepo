
import {
  X,
  Building2,
  Mail,
  ShieldCheck,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  Eye,
  MousePointerClick,
  FileEdit,
  Trash2,
  Plus,
  Edit2,
  Camera,
  Upload,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { useState, useEffect } from "react"
import { useSidebar } from "@/contexts/sidebar-context"

interface User {
  id: string
  name: string
  email: string
  user_type: string
  company_name?: string
  is_active: boolean
  created_at: string
  last_login?: string
  phone?: string
  role?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

interface UserDetailsSlidesPanelProps {
  open: boolean
  onClose: () => void
  user: User | null
  onEdit?: () => void
}

export function UserDetailsSlidePanel({ open, onClose, user, onEdit }: UserDetailsSlidesPanelProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [timePeriod, setTimePeriod] = useState("7")
  const [searchLog, setSearchLog] = useState("")
  const [filterLogType, setFilterLogType] = useState("all")
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<User> | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const { sidebarWidth } = useSidebar()

  useEffect(() => {
    if (!open) {
      setIsClosing(false)
      setEditMode(false)
      setEditData(null)
    }
  }, [open])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleEditMode = () => {
    setEditMode(true)
    if (user) {
      setEditData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setEditData(null)
  }

  const handleSaveClick = () => {
    setConfirmSave(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        setIsUploadingImage(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        setIsUploadingImage(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveImage = () => {
    if (imagePreview) {
      setProfileImage(imagePreview)
      setShowImageUpload(false)
      setImagePreview(null)
      setIsUploadingImage(false)
    }
  }

  const handleCancelImageUpload = () => {
    setShowImageUpload(false)
    setImagePreview(null)
    setIsUploadingImage(false)
  }

  const handleConfirmSave = () => {
    // Simulate saving - in a real app, this would call an API
    console.log("[v0] Salvando dados do usuário:", editData)
    setEditMode(false)
    setEditData(null)
    setConfirmSave(false)
    // Optional: Show success message or trigger parent callback
  }

  const handleEditFieldChange = (field: string, value: string) => {
    setEditData((prev) => prev ? { ...prev, [field]: value } : null)
  }

  if (!open && !isClosing) return null
  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserTypeColor = (type: string | undefined) => {
    if (!type) return "bg-gray-500"
    switch (type.toLowerCase()) {
      case "company":
      case "empresa":
        return "from-blue-500 to-blue-600"
      case "agency":
        return "from-purple-500 to-purple-600"
      case "nomade":
        return "from-green-500 to-green-600"
      case "team_allka":
        return "from-orange-500 to-orange-600"
      case "partner":
        return "from-pink-500 to-pink-600"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getUserTypeLabel = (type: string | undefined) => {
    if (!type) return "N/A"
    const labels: Record<string, string> = {
      company: "Empresa",
      empresa: "Empresa",
      agency: "Agency",
      nomade: "Nômade",
      team_allka: "Team Allka",
      partner: "Partner",
    }
    return labels[type.toLowerCase()] || type
  }

  const sessions = [
    { date: "22 de jan.", duration: "1h 2min", actions: 45 },
    { date: "21 de jan.", duration: "38min", actions: 28 },
    { date: "20 de jan.", duration: "51min", actions: 37 },
    { date: "19 de jan.", duration: "29min", actions: 19 },
    { date: "18 de jan.", duration: "44min", actions: 31 },
    { date: "17 de jan.", duration: "55min", actions: 42 },
    { date: "16 de jan.", duration: "41min", actions: 26 },
  ]

  const permissions = ["Visualizar Projetos", "Criar Projetos", "Gerenciar Usuários"]

  const activityLogs = [
    {
      id: 1,
      action: "Login na plataforma",
      type: "auth",
      timestamp: "23/01/2024 14:30",
      ip: "192.168.1.100",
      details: "Login bem-sucedido",
    },
    {
      id: 2,
      action: "Criou novo projeto",
      type: "create",
      timestamp: "23/01/2024 14:35",
      ip: "192.168.1.100",
      details: "Projeto: Website Redesign",
    },
    {
      id: 3,
      action: "Editou projeto",
      type: "edit",
      timestamp: "23/01/2024 15:20",
      ip: "192.168.1.100",
      details: "Alterou descrição do projeto",
    },
    {
      id: 4,
      action: "Visualizou dashboard",
      type: "view",
      timestamp: "23/01/2024 15:45",
      ip: "192.168.1.100",
      details: "Acessou dashboard principal",
    },
    {
      id: 5,
      action: "Adicionou usuário",
      type: "create",
      timestamp: "23/01/2024 16:10",
      ip: "192.168.1.100",
      details: "Novo usuário: João Silva",
    },
    {
      id: 6,
      action: "Alterou configurações",
      type: "edit",
      timestamp: "23/01/2024 16:30",
      ip: "192.168.1.100",
      details: "Atualizou preferências de notificação",
    },
    {
      id: 7,
      action: "Deletou arquivo",
      type: "delete",
      timestamp: "23/01/2024 17:00",
      ip: "192.168.1.100",
      details: "Removeu arquivo antigo.pdf",
    },
    {
      id: 8,
      action: "Logout da plataforma",
      type: "auth",
      timestamp: "23/01/2024 17:30",
      ip: "192.168.1.100",
      details: "Sessão encerrada",
    },
    {
      id: 9,
      action: "Login na plataforma",
      type: "auth",
      timestamp: "22/01/2024 09:00",
      ip: "192.168.1.100",
      details: "Login bem-sucedido",
    },
    {
      id: 10,
      action: "Exportou relatório",
      type: "view",
      timestamp: "22/01/2024 11:30",
      ip: "192.168.1.100",
      details: "Relatório mensal exportado",
    },
  ]

  const getLogIcon = (type: string) => {
    switch (type) {
      case "auth":
        return <ShieldCheck className="h-4 w-4" />
      case "create":
        return <Plus className="h-4 w-4" />
      case "edit":
        return <FileEdit className="h-4 w-4" />
      case "delete":
        return <Trash2 className="h-4 w-4" />
      case "view":
        return <Eye className="h-4 w-4" />
      default:
        return <MousePointerClick className="h-4 w-4" />
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case "auth":
        return "text-blue-600 bg-blue-50"
      case "create":
        return "text-green-600 bg-green-50"
      case "edit":
        return "text-orange-600 bg-orange-50"
      case "delete":
        return "text-red-600 bg-red-50"
      case "view":
        return "text-purple-600 bg-purple-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.details.toLowerCase().includes(searchLog.toLowerCase())
    const matchesType = filterLogType === "all" || log.type === filterLogType
    return matchesSearch && matchesType
  })

  return (
    <>
      {/* Modal panel without overlay */}
      <div
        style={{ width: '50vw' }}
        className={`fixed top-0 right-0 h-[calc(100%-32px)] bg-white shadow-2xl z-50 flex flex-col transition-all duration-500 ease-out ${
          open && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b app-brand-header">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Detalhes do Usuário</h2>
              <p className="text-xs text-blue-100">Visualize todas as informações do usuário</p>
            </div>
          </div>
          <Button onClick={handleClose} size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <div className="relative border-b border-gray-200 px-4 pt-2 pb-0 bg-gradient-to-b from-gray-50 to-white overflow-visible">
            <TabsList className="inline-flex h-auto bg-transparent gap-0 p-0 relative">
              <TabsTrigger
                value="info"
                className="relative px-6 py-2.5 text-sm font-medium transition-all duration-300 border-0 rounded-t-lg
                  data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:via-purple-500 data-[state=active]:to-pink-500
                  data-[state=active]:text-white data-[state=active]:shadow-[0_4px_14px_rgba(99,102,241,0.4)]
                  data-[state=active]:scale-105 data-[state=active]:translate-y-[-2px] data-[state=active]:z-10
                  data-[state=active]:skew-x-[-5deg]
                  data-[state=inactive]:bg-gray-200 data-[state=inactive]:text-gray-600
                  data-[state=inactive]:hover:bg-gray-300 data-[state=inactive]:hover:text-gray-800
                  data-[state=inactive]:scale-95 data-[state=inactive]:translate-y-0
                  data-[state=inactive]:skew-x-[-2deg] data-[state=inactive]:opacity-80
                  -mr-2"
              >
                <span className="inline-block skew-x-[5deg]">Informações</span>
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="relative px-6 py-2.5 text-sm font-medium transition-all duration-300 border-0 rounded-t-lg
                  data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:via-purple-500 data-[state=active]:to-pink-500
                  data-[state=active]:text-white data-[state=active]:shadow-[0_4px_14px_rgba(99,102,241,0.4)]
                  data-[state=active]:scale-105 data-[state=active]:translate-y-[-2px] data-[state=active]:z-10
                  data-[state=active]:skew-x-[-5deg]
                  data-[state=inactive]:bg-gray-200 data-[state=inactive]:text-gray-600
                  data-[state=inactive]:hover:bg-gray-300 data-[state=inactive]:hover:text-gray-800
                  data-[state=inactive]:scale-95 data-[state=inactive]:translate-y-0
                  data-[state=inactive]:skew-x-[-2deg] data-[state=inactive]:opacity-80
                  -mr-2"
              >
                <span className="inline-block skew-x-[5deg]">Permissões</span>
              </TabsTrigger>
              <TabsTrigger
                value="usage"
                className="relative px-6 py-2.5 text-sm font-medium transition-all duration-300 border-0 rounded-t-lg
                  data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:via-purple-500 data-[state=active]:to-pink-500
                  data-[state=active]:text-white data-[state=active]:shadow-[0_4px_14px_rgba(99,102,241,0.4)]
                  data-[state=active]:scale-105 data-[state=active]:translate-y-[-2px] data-[state=active]:z-10
                  data-[state=active]:skew-x-[-5deg]
                  data-[state=inactive]:bg-gray-200 data-[state=inactive]:text-gray-600
                  data-[state=inactive]:hover:bg-gray-300 data-[state=inactive]:hover:text-gray-800
                  data-[state=inactive]:scale-95 data-[state=inactive]:translate-y-0
                  data-[state=inactive]:skew-x-[-2deg] data-[state=inactive]:opacity-80"
              >
                <span className="inline-block skew-x-[5deg] flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Uso
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Fixed ScrollArea with proper height constraint for scroll to work */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Informações Tab */}
              <TabsContent value="info" className="mt-0">
                <div className="space-y-3">
                  {/* User Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="relative group">
                        <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                          {profileImage ? (
                            <img src={profileImage} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <AvatarFallback
                              className={`bg-gradient-to-br ${getUserTypeColor(user.user_type)} text-white text-lg font-bold`}
                            >
                              {getInitials(user.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <button
                          onClick={() => setShowImageUpload(true)}
                          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                          <Camera className="h-5 w-5 text-white" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                          <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShieldCheck className="h-3 w-3 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Badge variant="outline" className="text-xs py-0 h-5">
                            {getUserTypeLabel(user.user_type)}
                          </Badge>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className="text-xs py-0 h-5 bg-gray-900"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-white mr-1" />
                            {user.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="default" className="text-xs py-0 h-5 bg-green-500">
                            <div className="h-1.5 w-1.5 rounded-full bg-white mr-1" />
                            Online
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 font-medium">{user.role || "Admin Empresa"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <h4 className="text-base font-bold text-gray-900">Informações Pessoais</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Dados básicos do usuário</p>

                    {!editMode ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Nome Completo</label>
                          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Email
                          </label>
                          <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Tipo de Conta</label>
                          <p className="text-sm font-semibold text-gray-900">{getUserTypeLabel(user.user_type)}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Função</label>
                          <p className="text-sm font-semibold text-gray-900">{user.role || "Admin Empresa"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            ID da Empresa
                          </label>
                          <p className="text-sm font-semibold text-gray-900">{user.company_name || "N/A"}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Nome Completo</label>
                            <Input
                              value={editData?.name || ""}
                              onChange={(e) => handleEditFieldChange("name", e.target.value)}
                              placeholder="Nome completo"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Email
                            </label>
                            <Input
                              value={editData?.email || ""}
                              onChange={(e) => handleEditFieldChange("email", e.target.value)}
                              placeholder="email@exemplo.com"
                              type="email"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                            <Input
                              value={editData?.phone || ""}
                              onChange={(e) => handleEditFieldChange("phone", e.target.value)}
                              placeholder="(11) 98765-4321"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Endereço</label>
                            <Input
                              value={editData?.address || ""}
                              onChange={(e) => handleEditFieldChange("address", e.target.value)}
                              placeholder="Rua ou Avenida"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
                            <Input
                              value={editData?.city || ""}
                              onChange={(e) => handleEditFieldChange("city", e.target.value)}
                              placeholder="São Paulo"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Estado</label>
                            <Input
                              value={editData?.state || ""}
                              onChange={(e) => handleEditFieldChange("state", e.target.value)}
                              placeholder="SP"
                              maxLength={2}
                              className="text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">CEP</label>
                            <Input
                              value={editData?.zipCode || ""}
                              onChange={(e) => handleEditFieldChange("zipCode", e.target.value)}
                              placeholder="01234-567"
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveClick}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Salvar alterações
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Data Section */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <h4 className="text-base font-bold text-gray-900">Dados da Conta</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Histórico de acesso e cadastro</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Data de Cadastro</label>
                        <p className="text-sm font-semibold text-gray-900">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Último Acesso</label>
                        <p className="text-sm font-semibold text-gray-900">
                          {user.last_login
                            ? new Date(user.last_login).toLocaleString("pt-BR")
                            : "Nunca"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">Status</label>
                        <p className="text-sm font-semibold">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              user.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
              </TabsContent>

              {/* Permissões Tab */}
              <TabsContent value="permissions" className="mt-0">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center">
                      <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900">Permissões</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Permissões concedidas ao usuário</p>

                  <div className="flex flex-wrap gap-2">
                    {permissions.map((permission, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-medium text-gray-700">{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Uso Tab */}
              <TabsContent value="usage" className="mt-0">
                <div className="space-y-3">
                  {/* Usage Statistics */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-base font-bold text-gray-900">Estatísticas de Uso</h4>
                        <p className="text-xs text-gray-500">Acompanhe seu tempo e atividade na plataforma</p>
                      </div>
                      <Select value={timePeriod} onValueChange={setTimePeriod}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Últimos 7 dias</SelectItem>
                          <SelectItem value="30">Últimos 30 dias</SelectItem>
                          <SelectItem value="90">Últimos 90 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {/* Último Acesso */}
                      <div className="bg-white rounded-lg p-3 border-l-4 border-blue-500 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-xs font-medium text-gray-600">Último Acesso</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">23/01/2024,</p>
                        <p className="text-xs text-gray-500">14:30</p>
                      </div>

                      {/* Tempo Médio/Sessão */}
                      <div className="bg-white rounded-lg p-3 border-l-4 border-green-500 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium text-gray-600">Tempo Médio/Sessão</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 mb-1.5">45min</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "65%" }} />
                        </div>
                      </div>

                      {/* Tempo Total */}
                      <div className="bg-white rounded-lg p-3 border-l-4 border-purple-500 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          <span className="text-xs font-medium text-gray-600">Tempo Total</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">127.5h</p>
                        <p className="text-xs text-gray-500">156 sessões</p>
                      </div>

                      {/* Nível de Atividade */}
                      <div className="bg-white rounded-lg p-3 border-l-4 border-orange-500 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="h-4 w-4 text-orange-500" />
                          <span className="text-xs font-medium text-gray-600">Nível de Atividade</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 mb-1.5">Alto</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 w-full rounded-full ${i <= 4 ? "bg-orange-500" : "bg-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session History */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <h4 className="text-base font-bold text-gray-900">Histórico de Sessões</h4>
                    </div>

                    <div className="space-y-2">
                      {sessions.map((session, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-700 w-20">{session.date}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min((Number.parseInt(session.duration) / 90) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {session.actions} ações
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-blue-900 mb-1">Resumo do Período</h4>
                        <p className="text-xs text-blue-700 mb-3">
                          Você está acima da média de tempo por sessão. Continue assim para manter sua produtividade!
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span className="text-xs font-semibold text-blue-900">156 sessões totais</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            <span className="text-xs font-semibold text-blue-900">128h de uso acumulado</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center">
                          <MousePointerClick className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <h4 className="text-base font-bold text-gray-900">Log de Atividades</h4>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {filteredLogs.length} registros
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Histórico completo de ações do usuário na plataforma</p>

                    {/* Filters */}
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Buscar atividade..."
                          value={searchLog}
                          onChange={(e) => setSearchLog(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Select value={filterLogType} onValueChange={setFilterLogType}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="auth">Autenticação</SelectItem>
                          <SelectItem value="create">Criação</SelectItem>
                          <SelectItem value="edit">Edição</SelectItem>
                          <SelectItem value="delete">Exclusão</SelectItem>
                          <SelectItem value="view">Visualização</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Activity Log List */}
                    <div className="space-y-2 max-h-96">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                          <div
                            className={`h-8 w-8 rounded-lg ${getLogColor(log.type)} flex items-center justify-center flex-shrink-0`}
                          >
                            {getLogIcon(log.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h5 className="text-xs font-semibold text-gray-900">{log.action}</h5>
                              <span className="text-xs text-gray-500">{log.timestamp}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{log.details}</p>
                            <span className="text-xs text-gray-400">IP: {log.ip}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t bg-gray-50">
          <Button onClick={handleClose} variant="outline" size="sm" className="h-8 text-xs bg-transparent">
            Fechar
          </Button>
        </div>

        {/* Save Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmSave}
          onClose={() => setConfirmSave(false)}
          onConfirm={handleConfirmSave}
          title="Confirmar Alterações"
          message="Tem certeza que deseja salvar as alterações deste usuário?"
          confirmText="Confirmar"
          cancelText="Cancelar"
          destructive={false}
        />

        {/* Image Upload Modal */}
        {showImageUpload && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Alterar Foto de Perfil</h3>
                <button
                  onClick={handleCancelImageUpload}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!isUploadingImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer block">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">Arraste uma imagem aqui</p>
                    <p className="text-xs text-gray-500 mt-1">ou clique para selecionar</p>
                    <p className="text-xs text-gray-400 mt-2">JPG, PNG ou WEBP (máx. 5MB)</p>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={imagePreview || ''}
                      alt="Preview"
                      className="w-full h-80 object-cover rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Preview da imagem. Clique em "Salvar" para confirmar.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelImageUpload}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveImage}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default UserDetailsSlidePanel
