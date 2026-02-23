
import { useState } from "react"
import { X, Shield, Users, Building2, Briefcase, DollarSign, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSidebar } from "@/contexts/sidebar-context"

interface PermissionProfileSlidePanelProps {
  open: boolean
  onClose: () => void
  profile?: any
  onSave: (profile: any) => void
}

const permissionModules = [
  { key: "users", label: "Usuários", icon: Users },
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "projects", label: "Projetos", icon: Briefcase },
  { key: "nomades", label: "Nômades", icon: Users },
  { key: "financial", label: "Financeiro", icon: DollarSign },
  { key: "settings", label: "Configurações", icon: Settings },
]

const permissionActions = [
  { key: "view", label: "Visualizar" },
  { key: "create", label: "Criar" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Excluir" },
]

export function PermissionProfileSlidePanel({ open, onClose, profile, onSave }: PermissionProfileSlidePanelProps) {
  const [formData, setFormData] = useState(
    profile || {
      name: "",
      description: "",
      permissions: {
        users: { view: false, create: false, edit: false, delete: false },
        companies: { view: false, create: false, edit: false, delete: false },
        projects: { view: false, create: false, edit: false, delete: false },
        nomades: { view: false, create: false, edit: false, delete: false },
        financial: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, create: false, edit: false, delete: false },
      },
    },
  )

  const [isClosing, setIsClosing] = useState(false)
  const { sidebarWidth } = useSidebar()

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  const handlePermissionChange = (module: string, action: string, value: boolean) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [module]: {
          ...formData.permissions[module],
          [action]: value,
        },
      },
    })
  }

  const handleSave = () => {
    onSave(formData)
    handleClose()
  }

  if (!open) return null

  return (
    <div
      style={{ width: `calc(100% - ${sidebarWidth}px)` }}
      className={`fixed top-0 bottom-8 right-0 bg-white shadow-2xl z-50 flex flex-col transition-all duration-500 ease-out ${
        isClosing ? "translate-x-full" : "translate-x-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">
              {profile?.id ? "Editar Perfil de Acesso" : "Novo Perfil de Acesso"}
            </h2>
            <p className="text-sm text-purple-100">Configure as permissões do perfil</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-xs">
                  Nome do Perfil
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Gerente de Projetos"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-xs">
                  Descrição
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descrição do perfil"
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Configurar Permissões por Módulo</h3>
            {permissionModules.map((module) => (
              <Card key={module.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <module.icon className="h-4 w-4 text-gray-600" />
                    {module.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {permissionActions.map((action) => (
                      <div key={action.key} className="flex items-center space-x-2">
                        <Switch
                          id={`${module.key}-${action.key}`}
                          checked={formData.permissions[module.key]?.[action.key] || false}
                          onCheckedChange={(checked) => handlePermissionChange(module.key, action.key, checked)}
                        />
                        <Label htmlFor={`${module.key}-${action.key}`} className="text-xs cursor-pointer">
                          {action.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={handleClose} className="h-9 text-sm bg-transparent">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          className="h-9 text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          Salvar Perfil
        </Button>
      </div>
    </div>
  )
}
