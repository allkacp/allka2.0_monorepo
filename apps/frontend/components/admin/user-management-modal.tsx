
import { useState } from "react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Shield, Calendar, User, CheckCircle2, Sparkles, Clock, MapPin, Search, Loader2 } from "lucide-react"
import { AddressMapSelector } from "./address-map-selector"
import { UserUsageDashboard } from "@/components/user-usage-dashboard"
import type { User as UserType } from "@/types/user"

const PERMISSION_ROLES = {
  admin: {
    name: "Administrador",
    description: "Acesso completo ao sistema",
    permissions: [
      "view_projects",
      "create_projects",
      "edit_projects",
      "cancel_projects",
      "view_catalog",
      "purchase_services",
      "manage_users",
      "view_payments",
      "manage_payments",
      "approve_deliveries",
      "access_ai_knowledge",
      "edit_ai_knowledge",
      "view_analytics",
      "admin_access",
    ],
  },
  financeiro: {
    name: "Financeiro",
    description: "Acesso a pagamentos e relatórios financeiros",
    permissions: ["view_projects", "view_payments", "manage_payments", "view_analytics"],
  },
  gestor_projetos: {
    name: "Gestor de Projetos",
    description: "Gerenciamento completo de projetos",
    permissions: [
      "view_projects",
      "create_projects",
      "edit_projects",
      "cancel_projects",
      "approve_deliveries",
      "view_analytics",
    ],
  },
  visualizador: {
    name: "Visualizador",
    description: "Apenas visualização de projetos e catálogo",
    permissions: ["view_projects", "view_catalog"],
  },
  comprador: {
    name: "Comprador",
    description: "Visualização e compra de serviços",
    permissions: ["view_projects", "view_catalog", "purchase_services"],
  },
}

interface UserManagementModalProps {
  user: UserType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (user: UserType) => void
}

export function UserManagementModal({ user, open, onOpenChange, onSave }: UserManagementModalProps) {
  const [editedUser, setEditedUser] = useState<UserType>(user)
  const [loading, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string>("")
  const [showRoleElevationConfirm, setShowRoleElevationConfirm] = useState(false)
  const [pendingRole, setPendingRole] = useState<string>("")

  const applyPermissionRole = (roleKey: string) => {
    const role = PERMISSION_ROLES[roleKey as keyof typeof PERMISSION_ROLES]
    if (role) {
      if (roleKey === "admin" && !editedUser.is_admin) {
        setPendingRole(roleKey)
        setShowRoleElevationConfirm(true)
        return
      }
      setEditedUser({ ...editedUser, permissions: role.permissions as any[] })
      setSelectedRole(roleKey)
    }
  }

  const confirmRoleElevation = () => {
    const role = PERMISSION_ROLES[pendingRole as keyof typeof PERMISSION_ROLES]
    if (role) {
      setEditedUser({
        ...editedUser,
        permissions: role.permissions as any[],
        is_admin: pendingRole === "admin",
      })
      setSelectedRole(pendingRole)
    }
    setShowRoleElevationConfirm(false)
    setPendingRole("")
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "empresas":
        return "Empresa"
      case "agencias":
        return "Agência"
      case "nomades":
        return "Nômade"
      case "admin":
        return "Admin"
      default:
        return type
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "Company Admin"
      case "company_user":
        return "Company User"
      case "agency_admin":
        return "Agency Admin"
      case "agency_user":
        return "Agency User"
      case "nomad_admin":
        return "Nomad Admin"
      case "nomad":
        return "Nomad Admin"
      case "admin":
        return "Administrador"
      default:
        return role
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }
  }

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "")
    let formattedCep = cleanCep
    if (cleanCep.length > 5) {
      formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`
    }

    setEditedUser({
      ...editedUser,
      address: { ...editedUser.address, cep: formattedCep } as any,
    })

    if (cleanCep.length === 8) {
      setCepLoading(true)
      setCepError("")

      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await response.json()

        if (data.erro) {
          setCepError("CEP não encontrado")
          setCepLoading(false)
          return
        }

        setEditedUser({
          ...editedUser,
          address: {
            cep: formattedCep,
            street: data.logradouro || "",
            number: editedUser.address?.number || "",
            complement: data.complemento || editedUser.address?.complement || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
            latitude: editedUser.address?.latitude,
            longitude: editedUser.address?.longitude,
          },
        })

        setCepLoading(false)
      } catch (error) {
        console.error("Error fetching CEP:", error)
        setCepError("Erro ao buscar CEP")
        setCepLoading(false)
      }
    }
  }

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setEditedUser({
      ...editedUser,
      address: {
        ...editedUser.address,
        latitude: lat,
        longitude: lng,
        cep: editedUser.address?.cep || "",
        street: editedUser.address?.street || "",
        number: editedUser.address?.number || "",
        complement: editedUser.address?.complement || "",
        neighborhood: editedUser.address?.neighborhood || "",
        city: editedUser.address?.city || "",
        state: editedUser.address?.state || "",
      } as any,
    })
  }

  const handleSave = () => {
    setSaving(true)
    onSave(editedUser)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-[calc(100vh-32px)] bg-background w-[800px]",
            "shadow-[rgba(0,0,0,0.2)_-8px_0px_32px_0px,rgba(0,0,0,0.1)_-4px_0px_16px_0px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
            "duration-300 ease-in-out overflow-hidden flex flex-col",
          )}
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-shrink-0 p-8 pb-4 border-b">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Gerenciar Usuário</h2>
            </div>
            <p className="text-muted-foreground">Edite as informações e permissões do usuário</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-3">
            <Tabs defaultValue="basic" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5 flex-shrink-0 h-8">
                <TabsTrigger value="basic" className="text-xs py-1">Informações</TabsTrigger>
                <TabsTrigger value="address" className="text-xs py-1">Endereço</TabsTrigger>
                <TabsTrigger value="permissions" className="text-xs py-1">Permissões</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs py-1">Atividade</TabsTrigger>
                <TabsTrigger value="usage" className="text-xs py-1">Uso</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3 mt-3 overflow-y-auto max-h-[44vh]">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-blue-600 text-white text-xl">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xl font-semibold">{user.name}</h3>
                          {user.is_admin && <Shield className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{getAccountTypeLabel(user.account_type)}</Badge>
                          <Badge variant={user.is_active ? "default" : "destructive"}>
                            {user.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>Dados básicos do usuário</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={editedUser.name}
                          onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editedUser.email}
                          onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Status da Conta</Label>
                        <p className="text-sm text-muted-foreground">Ativar ou desativar o acesso do usuário</p>
                      </div>
                      <Switch
                        checked={editedUser.is_active}
                        onCheckedChange={(checked) => setEditedUser({ ...editedUser, is_active: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Privilégios de Admin</Label>
                        <p className="text-sm text-muted-foreground">Conceder acesso administrativo</p>
                      </div>
                      <Switch
                        checked={editedUser.is_admin}
                        onCheckedChange={(checked) => setEditedUser({ ...editedUser, is_admin: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="address" className="space-y-3 mt-3 overflow-y-auto max-h-[44vh]">
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-5 w-5 text-blue-600" />
                      <span>Buscar por CEP</span>
                    </CardTitle>
                    <CardDescription>Digite o CEP para preencher automaticamente o endereço</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          maxLength={9}
                          value={editedUser.address?.cep || ""}
                          onChange={(e) => handleCepChange(e.target.value)}
                          className={cepError ? "border-red-500" : ""}
                        />
                        {cepLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          </div>
                        )}
                      </div>
                      {cepError && <p className="text-sm text-red-600">{cepError}</p>}
                      {!cepError && editedUser.address?.cep && (
                        <p className="text-sm text-green-600 flex items-center space-x-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>CEP válido</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <span>Endereço Completo</span>
                    </CardTitle>
                    <CardDescription>Informações detalhadas do endereço</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Rua/Avenida</Label>
                        <Input
                          id="street"
                          value={editedUser.address?.street || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              address: { ...editedUser.address, street: e.target.value } as any,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          value={editedUser.address?.number || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              address: { ...editedUser.address, number: e.target.value } as any,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          placeholder="Apto, Bloco, etc."
                          value={editedUser.address?.complement || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              address: { ...editedUser.address, complement: e.target.value } as any,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={editedUser.address?.neighborhood || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              address: { ...editedUser.address, neighborhood: e.target.value } as any,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={editedUser.address?.city || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              address: { ...editedUser.address, city: e.target.value } as any,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          placeholder="UF"
                          maxLength={2}
                          value={editedUser.address?.state || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              address: { ...editedUser.address, state: e.target.value.toUpperCase() } as any,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <AddressMapSelector
                  onLocationSelect={handleLocationSelect}
                  initialLat={editedUser.address?.latitude}
                  initialLng={editedUser.address?.longitude}
                />
              </TabsContent>

              <TabsContent value="permissions" className="space-y-3 mt-3 overflow-y-auto max-h-[44vh]">
                {showRoleElevationConfirm && (
                  <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-400">
                        <Shield className="h-5 w-5" />
                        <span>Confirmação de Elevação de Privilégios</span>
                      </CardTitle>
                      <CardDescription>
                        Você está prestes a elevar este usuário para o perfil de{" "}
                        <strong>{PERMISSION_ROLES[pendingRole as keyof typeof PERMISSION_ROLES]?.name}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-orange-200">
                        <p className="text-sm font-medium mb-2">Esta ação concederá as seguintes permissões:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PERMISSION_ROLES[pendingRole as keyof typeof PERMISSION_ROLES]?.permissions.map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                              {perm.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowRoleElevationConfirm(false)
                            setPendingRole("")
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={confirmRoleElevation} className="bg-gradient-to-r from-orange-600 to-red-600">
                          <Shield className="h-4 w-4 mr-2" />
                          Confirmar Elevação
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <span>Perfis de Permissão Predefinidos</span>
                    </CardTitle>
                    <CardDescription>
                      Selecione um perfil para aplicar permissões rapidamente e elevar privilégios
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedRole} onValueChange={applyPermissionRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil de permissão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERMISSION_ROLES).map(([key, role]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex flex-col">
                              <span className="font-medium">{role.name}</span>
                              <span className="text-xs text-muted-foreground">{role.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedRole && (
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border animate-in fade-in-0 slide-in-from-top-2 duration-300">
                        <p className="text-sm font-medium mb-2">Permissões incluídas neste perfil:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PERMISSION_ROLES[selectedRole as keyof typeof PERMISSION_ROLES].permissions.map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                              {perm.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Permissões Personalizadas</CardTitle>
                    <CardDescription>
                      Ajuste permissões individuais conforme necessário (alterações em tempo real)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: "view_projects", label: "Visualizar Projetos" },
                        { key: "create_projects", label: "Criar Projetos" },
                        { key: "edit_projects", label: "Editar Projetos" },
                        { key: "cancel_projects", label: "Cancelar Projetos" },
                        { key: "view_catalog", label: "Visualizar Catálogo" },
                        { key: "purchase_services", label: "Comprar Serviços" },
                        { key: "manage_users", label: "Gerenciar Usuários" },
                        { key: "view_payments", label: "Visualizar Pagamentos" },
                        { key: "manage_payments", label: "Gerenciar Pagamentos" },
                        { key: "approve_deliveries", label: "Aprovar Entregas" },
                        { key: "access_ai_knowledge", label: "Acessar IA" },
                        { key: "edit_ai_knowledge", label: "Editar IA" },
                        { key: "view_analytics", label: "Visualizar Analytics" },
                        { key: "admin_access", label: "Acesso Admin" },
                      ].map((permission) => (
                        <div
                          key={permission.key}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
                            editedUser.permissions.includes(permission.key as any) &&
                              "bg-green-50 dark:bg-green-950/20",
                          )}
                        >
                          <Label className="cursor-pointer">{permission.label}</Label>
                          <Switch
                            checked={editedUser.permissions.includes(permission.key as any)}
                            onCheckedChange={(checked) => {
                              const newPermissions = checked
                                ? [...editedUser.permissions, permission.key as any]
                                : editedUser.permissions.filter((p) => p !== permission.key)
                              setEditedUser({ ...editedUser, permissions: newPermissions })
                              setSelectedRole("") // Clear selected role when manually changing permissions
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3 mt-3 overflow-y-auto max-h-[44vh]">
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Última Entrada</span>
                    </CardTitle>
                    <CardDescription>Último acesso do usuário ao sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-900 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Data e Hora do Último Acesso</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <p className="text-lg font-semibold">
                            {user.last_login ? formatDateTime(user.last_login).date : "Nunca acessou"}
                          </p>
                          {user.last_login && (
                            <>
                              <span className="text-muted-foreground">às</span>
                              <p className="text-lg font-semibold text-blue-600">
                                {formatDateTime(user.last_login).time}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Informações da Conta</CardTitle>
                    <CardDescription>Dados de criação e última atividade</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Criado em</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(user.created_at).date} às {formatDateTime(user.created_at).time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Última atualização</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(user.updated_at).date} às {formatDateTime(user.updated_at).time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="mt-3 overflow-y-auto max-h-[44vh]">
                <UserUsageDashboard />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex-shrink-0 flex justify-end space-x-2 p-8 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
