// @ts-nocheck
import React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Calendar,
  User,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Key,
  Eye,
  Edit,
  Clock,
  BarChart3,
  X,
  Camera,
} from "lucide-react"
import { UserUsageDashboard } from "@/components/user-usage-dashboard"
import type { User as UserType } from "@/types/user"
import { cn } from "@/lib/utils"
import { useState, useRef } from "react"

interface UserViewModalProps {
  user: UserType
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function UserViewModal({ user, open, onOpenChange, onEdit }: UserViewModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveImage = async () => {
    if (!selectedImage) return

    setIsSaving(true)
    try {
      // Simulate API call to save image
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log("[v0] Profile image updated for user:", user.id)
      // Reset preview
      setSelectedImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("[v0] Error saving image:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "empresas":
        return "bg-info-muted text-info-foreground"
      case "agencias":
        return "bg-primary/10 text-primary dark:bg-primary/20"
      case "nomades":
        return "bg-success-muted text-success-foreground"
      case "admin":
        return "bg-destructive/10 text-destructive dark:bg-destructive/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "Admin Empresa"
      case "company_user":
        return "Usuário Empresa"
      case "agency_admin":
        return "Admin Agência"
      case "agency_user":
        return "Usuário Agência"
      case "nomad":
        return "Nômade"
      case "admin":
        return "Administrador"
      default:
        return role
    }
  }

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      view_projects: "Visualizar Projetos",
      create_projects: "Criar Projetos",
      edit_projects: "Editar Projetos",
      cancel_projects: "Cancelar Projetos",
      view_catalog: "Visualizar Catálogo",
      purchase_services: "Comprar Serviços",
      manage_users: "Gerenciar Usuários",
      view_payments: "Visualizar Pagamentos",
      manage_payments: "Gerenciar Pagamentos",
      approve_deliveries: "Aprovar Entregas",
      access_ai_knowledge: "Acessar IA",
      edit_ai_knowledge: "Editar IA",
      view_analytics: "Visualizar Analytics",
      admin_access: "Acesso Admin",
    }
    return labels[permission] || permission
  }

  const getOnlineStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <Badge className="bg-success-muted text-success-foreground">
            <div className="h-2 w-2 rounded-full bg-online mr-1.5 animate-pulse"></div>
            Online
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="outline" className="text-offline">
            <div className="h-2 w-2 rounded-full bg-offline mr-1.5"></div>
            Offline
          </Badge>
        )
      case "busy":
        return (
          <Badge className="bg-destructive/10 text-destructive dark:bg-destructive/20">
            <div className="h-2 w-2 rounded-full bg-busy mr-1.5"></div>
            Ocupado
          </Badge>
        )
      case "away":
        return (
          <Badge className="bg-warning-muted text-warning-foreground">
            <div className="h-2 w-2 rounded-full bg-away mr-1.5"></div>
            Ausente
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <div className="h-2 w-2 rounded-full bg-muted-foreground mr-1.5"></div>
            Desconhecido
          </Badge>
        )
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-[calc(100vh-32px)] bg-background w-1/2",
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

          <div className="flex-shrink-0 p-8 pb-4 border-b bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Detalhes do Usuário</h2>
            </div>
            <p className="text-blue-100">Visualize todas as informações do usuário</p>
          </div>

          {selectedImage && (
            <div className="bg-blue-50 border-b border-blue-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={selectedImage || "/placeholder.svg"}
                    alt="Preview"
                    className="h-16 w-16 rounded-lg object-cover ring-2 ring-blue-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Nova foto de perfil</p>
                    <p className="text-xs text-gray-600">Clique em "Salvar" para confirmar a mudança</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={handleCancelImage}
                    variant="outline"
                    size="sm"
                    className="text-gray-700 bg-transparent"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveImage}
                    disabled={isSaving}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-8 pt-4">
            <Tabs defaultValue="info" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="permissions">Permissões</TabsTrigger>
                <TabsTrigger value="usage">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Uso
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                      <Avatar className="h-20 w-20 ring-4 ring-info/20">
                        <AvatarImage src={selectedImage || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-info to-primary text-white text-2xl font-bold">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        aria-label="Upload profile image"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 rounded-full bg-blue-500/80 hover:bg-blue-600 p-2 shadow-md cursor-pointer transition-colors"
                        title="Change profile photo"
                      >
                        <Camera className="h-4 w-4 text-white" />
                      </button>
                    </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-2xl font-bold">{user.name}</h3>
                          {user.is_admin && <Shield className="h-6 w-6 text-info" />}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getAccountTypeColor(user.account_type)}>
                            {getAccountTypeLabel(user.account_type)}
                          </Badge>
                          <Badge variant={user.is_active ? "default" : "destructive"}>
                            {user.is_active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inativo
                              </>
                            )}
                          </Badge>
                          {getOnlineStatusBadge(user.online_status)}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{getRoleLabel(user.role)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Informações Pessoais</span>
                    </CardTitle>
                    <CardDescription>Dados básicos do usuário</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                        <p className="text-base font-medium">{user.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email</span>
                        </p>
                        <p className="text-base font-medium">{user.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tipo de Conta</p>
                        <p className="text-base font-medium">{getAccountTypeLabel(user.account_type)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Função</p>
                        <p className="text-base font-medium">{getRoleLabel(user.role)}</p>
                      </div>
                      {user.company_id && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>ID da Empresa</span>
                          </p>
                          <p className="text-base font-medium">{user.company_id}</p>
                        </div>
                      )}
                      {user.agency_id && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>ID da Agência</span>
                          </p>
                          <p className="text-base font-medium">{user.agency_id}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-info/30 bg-gradient-to-br from-info-muted/50 to-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-info" />
                      <span>Último Acesso</span>
                    </CardTitle>
                    <CardDescription>Data e hora do último login do usuário</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4 p-4 bg-background rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-info-muted flex items-center justify-center">
                          <Clock className="h-6 w-6 text-info" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">Data e Hora</p>
                        {user.last_login ? (
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-lg font-semibold">{formatDateTime(user.last_login).date}</p>
                            <span className="text-muted-foreground">às</span>
                            <p className="text-lg font-semibold text-info">{formatDateTime(user.last_login).time}</p>
                          </div>
                        ) : (
                          <p className="text-lg font-semibold text-muted-foreground mt-1">Nunca acessou</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Atividade da Conta</span>
                    </CardTitle>
                    <CardDescription>Informações de criação e última atividade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-info-muted rounded-lg">
                          <Calendar className="h-4 w-4 text-info" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                          <p className="text-base font-medium">
                            {formatDateTime(user.created_at).date} às {formatDateTime(user.created_at).time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
                          <p className="text-base font-medium">
                            {formatDateTime(user.updated_at).date} às {formatDateTime(user.updated_at).time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5" />
                      <span>Permissões</span>
                    </CardTitle>
                    <CardDescription>Permissões concedidas ao usuário</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="px-3 py-1">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-success" />
                            {getPermissionLabel(permission)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma permissão específica concedida</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="mt-4 overflow-y-auto max-h-[50vh]">
                <UserUsageDashboard />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex-shrink-0 flex justify-end space-x-2 p-8 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={onEdit} className="bg-gradient-to-r from-info to-primary">
              <Edit className="h-4 w-4 mr-2" />
              Editar Usuário
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
