
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PermissionProfileSlidePanel } from "@/components/permission-profile-slide-panel"
import { Search, Plus, Users, Shield, Settings, BarChart3, Edit, Trash2 } from "lucide-react"

interface PermissionProfile {
  id: number
  name: string
  description: string
  users: number
  permissions: {
    [module: string]: {
      [action: string]: boolean
    }
  }
}

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<PermissionProfile | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const mockProfiles: PermissionProfile[] = [
    {
      id: 1,
      name: "Super Admin",
      description: "Acesso total ao sistema",
      users: 2,
      permissions: {
        Usuários: { view: true, create: true, edit: true, delete: true },
        Empresas: { view: true, create: true, edit: true, delete: true },
        Projetos: { view: true, create: true, edit: true, delete: true },
        Nômades: { view: true, create: true, edit: true, delete: true },
      },
    },
    {
      id: 2,
      name: "Gerente de Operações",
      description: "Gestão de projetos e nômades",
      users: 5,
      permissions: {
        Usuários: { view: true, create: false, edit: true, delete: false },
        Empresas: { view: true, create: false, edit: false, delete: false },
        Projetos: { view: true, create: true, edit: true, delete: false },
        Nômades: { view: true, create: true, edit: true, delete: false },
      },
    },
    {
      id: 3,
      name: "Analista Financeiro",
      description: "Acesso a relatórios financeiros",
      users: 3,
      permissions: {
        Usuários: { view: true, create: false, edit: false, delete: false },
        Empresas: { view: true, create: false, edit: false, delete: false },
        Projetos: { view: true, create: false, edit: false, delete: false },
        Financeiro: { view: true, create: true, edit: true, delete: false },
      },
    },
  ]

  const handleCreateProfile = () => {
    setSelectedProfile(null)
    setIsPanelOpen(true)
  }

  const handleEditProfile = (profile: PermissionProfile) => {
    setSelectedProfile(profile)
    setIsPanelOpen(true)
  }

  const handleSaveProfile = (profileData: any) => {
    console.log("Saving profile:", profileData)
    setIsPanelOpen(false)
  }

  const filteredProfiles = mockProfiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = [
    { label: "Total de Perfis", value: mockProfiles.length, icon: Shield, color: "blue" },
    {
      label: "Usuários com Perfil",
      value: mockProfiles.reduce((acc, p) => acc + p.users, 0),
      icon: Users,
      color: "green",
    },
    { label: "Módulos do Sistema", value: 8, icon: Settings, color: "purple" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gestão de Permissões</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure perfis de acesso e permissões granulares</p>
        </div>
        <Button
          onClick={handleCreateProfile}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-9"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      <Accordion type="single" collapsible className="mb-1">
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="bg-white hover:bg-slate-50 rounded-lg px-4 py-3 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Estatísticas e Métricas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                const colorClasses = {
                  blue: {
                    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
                    border: "border-blue-200",
                    icon: "text-blue-600",
                    text: "text-blue-900",
                    value: "text-blue-700",
                  },
                  green: {
                    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
                    border: "border-emerald-200",
                    icon: "text-emerald-600",
                    text: "text-emerald-900",
                    value: "text-emerald-700",
                  },
                  purple: {
                    bg: "bg-gradient-to-br from-violet-50 to-violet-100",
                    border: "border-violet-200",
                    icon: "text-violet-600",
                    text: "text-violet-900",
                    value: "text-violet-700",
                  },
                }[stat.color]

                return (
                  <Card key={index} className={`p-3 ${colorClasses.bg} ${colorClasses.border}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${colorClasses.icon}`} />
                      <span className={`text-xs font-medium ${colorClasses.text}`}>{stat.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${colorClasses.value}`}>{stat.value}</p>
                  </Card>
                )
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-2">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar perfis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">Perfis de Acesso</TabsTrigger>
                <TabsTrigger value="matrix">Matriz de Permissões</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-2 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProfiles.map((profile) => (
                    <Card key={profile.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-purple-600" />
                          <h3 className="font-semibold text-base">{profile.name}</h3>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProfile(profile)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{profile.description}</p>

                      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Usuários com este perfil</span>
                        <Badge variant="secondary" className="ml-auto">
                          {profile.users}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Módulos com Acesso:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(profile.permissions).map((module) => (
                            <Badge key={module} variant="outline" className="text-xs">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="matrix" className="space-y-2 mt-4">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Matriz de permissões - Em desenvolvimento
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <PermissionProfileSlidePanel
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        profile={selectedProfile}
        onSave={handleSaveProfile}
      />
    </div>
  )
}
