// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PermissionProfileSlidePanel } from "@/components/permission-profile-slide-panel"
import { Shield, Plus, Edit, Trash2, Users, Building2, Briefcase, DollarSign, Settings } from "lucide-react"
import PageHeader from "@/components/page-header"

// Mock permission profiles
const mockProfiles = [
  {
    id: 1,
    name: "Super Admin",
    description: "Acesso total ao sistema",
    userCount: 2,
    permissions: {
      users: { view: true, create: true, edit: true, delete: true },
      companies: { view: true, create: true, edit: true, delete: true },
      projects: { view: true, create: true, edit: true, delete: true },
      nomades: { view: true, create: true, edit: true, delete: true },
      financial: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true },
    },
  },
  {
    id: 2,
    name: "Gerente de Operações",
    description: "Gestão de projetos e nômades",
    userCount: 5,
    permissions: {
      users: { view: true, create: false, edit: true, delete: false },
      companies: { view: true, create: false, edit: true, delete: false },
      projects: { view: true, create: true, edit: true, delete: false },
      nomades: { view: true, create: true, edit: true, delete: false },
      financial: { view: true, create: false, edit: false, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
    },
  },
  {
    id: 3,
    name: "Analista Financeiro",
    description: "Acesso a relatórios financeiros",
    userCount: 3,
    permissions: {
      users: { view: true, create: false, edit: false, delete: false },
      companies: { view: true, create: false, edit: false, delete: false },
      projects: { view: true, create: false, edit: false, delete: false },
      nomades: { view: true, create: false, edit: false, delete: false },
      financial: { view: true, create: true, edit: true, delete: false },
      settings: { view: false, create: false, edit: false, delete: false },
    },
  },
]

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

export default function PermissoesPage() {
  const [profiles, setProfiles] = useState(mockProfiles)
  const [editingProfile, setEditingProfile] = useState<any>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const handleSaveProfile = (profileData: any) => {
    if (profileData.id) {
      setProfiles((profiles) => profiles.map((p) => (p.id === profileData.id ? profileData : p)))
    } else {
      const newProfile = { ...profileData, id: Date.now(), userCount: 0 }
      setProfiles((profiles) => [...profiles, newProfile])
    }
    setEditingProfile(null)
    setIsPanelOpen(false)
  }

  const handleDeleteProfile = (id: number) => {
    setProfiles((profiles) => profiles.filter((p) => p.id !== id))
  }

  const openEditPanel = (profile?: any) => {
    setEditingProfile(profile || null)
    setIsPanelOpen(true)
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Gestão de Permissões
          </span>
        }
        description="Configure perfis de acesso e permissões granulares"
        actions={
          <Button
            onClick={() => openEditPanel()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        }
      />

      <Tabs defaultValue="profiles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profiles">Perfis de Acesso</TabsTrigger>
          <TabsTrigger value="matrix">Matriz de Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4 text-purple-600" />
                        {profile.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">{profile.description}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditPanel(profile)}
                        className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <span className="text-xs text-gray-600">Usuários com este perfil</span>
                    <Badge variant="secondary" className="text-xs">
                      {profile.userCount}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Módulos com Acesso:</p>
                    <div className="flex flex-wrap gap-1">
                      {permissionModules
                        .filter((module) => profile.permissions[module.key]?.view)
                        .map((module) => (
                          <Badge key={module.key} variant="secondary" className="text-xs">
                            {module.label}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Permissões Totais:</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {permissionActions.map((action) => {
                        const count = permissionModules.filter(
                          (module) => profile.permissions[module.key]?.[action.key],
                        ).length
                        return (
                          <div key={action.key} className="bg-gray-50 rounded p-2">
                            <p className="text-base font-bold text-purple-600">{count}</p>
                            <p className="text-xs text-gray-600">{action.label}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matriz de Permissões por Perfil</CardTitle>
              <CardDescription className="text-xs">Visão geral de todas as permissões configuradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-xs">Perfil</th>
                      {permissionModules.map((module) => (
                        <th key={module.key} className="text-center p-2 font-medium text-xs">
                          {module.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-xs">{profile.name}</td>
                        {permissionModules.map((module) => {
                          const perms = profile.permissions[module.key]
                          const hasAny = perms?.view || perms?.create || perms?.edit || perms?.delete
                          const hasAll = perms?.view && perms?.create && perms?.edit && perms?.delete

                          return (
                            <td key={module.key} className="p-2 text-center">
                              {hasAll ? (
                                <Badge className="bg-green-500 text-xs">Total</Badge>
                              ) : hasAny ? (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                                >
                                  Parcial
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-500 text-xs">
                                  Nenhum
                                </Badge>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PermissionProfileSlidePanel
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        profile={editingProfile}
        onSave={handleSaveProfile}
      />
    </div>
  )
}

function ProfileForm({ profile, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(profile)

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
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nome do Perfil
          </label>
          <input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Gerente de Projetos"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Descrição
          </label>
          <input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Breve descrição do perfil"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Configurar Permissões</h3>
        <div className="space-y-4">
          {permissionModules.map((module) => (
            <Card key={module.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <module.icon className="h-4 w-4" />
                  {module.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {permissionActions.map((action) => (
                    <div key={action.key} className="flex items-center space-x-2">
                      <input
                        id={`${module.key}-${action.key}`}
                        type="checkbox"
                        checked={formData.permissions[module.key]?.[action.key] || false}
                        onChange={(e) => handlePermissionChange(module.key, action.key, e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <label htmlFor={`${module.key}-${action.key}`} className="text-sm">
                        {action.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave}>Salvar Perfil</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
