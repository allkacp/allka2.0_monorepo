
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter, Users, Shield, Mail, Calendar, UserCheck, UserX, Edit, Plus, MoreVertical } from "lucide-react"
import type { User } from "@/types/user"
import { PageHeader } from "@/components/page-header" // Import the PageHeader component

// Mock data para demonstração
const mockTeamMembers: User[] = [
  {
    id: 1,
    email: "carlos.silva@empresa.com",
    name: "Carlos Silva",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_admin",
    permissions: ["manage_users", "view_projects", "create_projects", "edit_projects"],
    is_admin: true,
    is_active: true,
    created_at: "2023-01-15",
    updated_at: "2024-01-20",
  },
  {
    id: 2,
    email: "maria.santos@empresa.com",
    name: "Maria Santos",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: true,
    created_at: "2023-03-10",
    updated_at: "2024-01-18",
  },
]

export default function InHouseEquipePage() {
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [filteredMembers, setFilteredMembers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setTeamMembers(mockTeamMembers)
      setFilteredMembers(mockTeamMembers)
      setLoading(false)
    }, 1000)
  }, [])

  useEffect(() => {
    let filtered = teamMembers

    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((member) => (filterStatus === "active" ? member.is_active : !member.is_active))
    }

    if (filterRole !== "all") {
      filtered = filtered.filter((member) => member.role === filterRole)
    }

    setFilteredMembers(filtered)
  }, [teamMembers, searchTerm, filterStatus, filterRole])

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "Administrador"
      case "company_user":
        return "Usuário"
      default:
        return role
    }
  }

  const getPermissionCount = (permissions: string[]) => {
    return permissions.length
  }

  const activeMembers = teamMembers.filter((member) => member.is_active)
  const inactiveMembers = teamMembers.filter((member) => !member.is_active)
  const adminMembers = teamMembers.filter((member) => member.is_admin)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-200">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 px-0 py-0 space-y-6">
        {/* Header */}
        <div className="px-0">
          <PageHeader
            title="Equipe"
            description="Gerencie todos os membros da sua equipe com acesso à plataforma"
            actions={
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-sm bg-white">
                  {filteredMembers.length} membros
                </Badge>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Membro
                </Button>
              </div>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-0">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Membros</p>
                  <p className="text-3xl font-bold text-gray-900">{teamMembers.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Membros Ativos</p>
                  <p className="text-3xl font-bold text-green-600">{activeMembers.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Administradores</p>
                  <p className="text-3xl font-bold text-purple-600">{adminMembers.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inativos</p>
                  <p className="text-3xl font-bold text-red-600">{inactiveMembers.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <UserX className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="px-0">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm bg-white"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm bg-white"
                  >
                    <option value="all">Todas as funções</option>
                    <option value="company_admin">Administradores</option>
                    <option value="company_user">Usuários</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Grid */}
        <div className="px-0">
          <Tabs defaultValue="grid" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md bg-white">
              <TabsTrigger value="grid">Visualização em Cards</TabsTrigger>
              <TabsTrigger value="list">Visualização em Lista</TabsTrigger>
            </TabsList>

            <TabsContent value="grid" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                  <Card
                    key={member.id}
                    className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              {member.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">{member.name}</h3>
                              {member.is_admin && <Shield className="h-4 w-4 text-blue-600" />}
                            </div>
                            <p className="text-sm text-gray-600">{getRoleLabel(member.role)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Desde {new Date(member.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={member.is_active ? "default" : "destructive"}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                          >
                            {member.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-white">
                            {getPermissionCount(member.permissions)} permissões
                          </Badge>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1 bg-white hover:bg-gray-50">
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="border-0 shadow-lg bg-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {member.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{member.name}</h3>
                            {member.is_admin && <Shield className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{member.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Desde {new Date(member.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-white">
                              {getRoleLabel(member.role)}
                            </Badge>
                            <Badge
                              variant={member.is_active ? "default" : "destructive"}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                            >
                              {member.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {getPermissionCount(member.permissions)} permissões ativas
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Empty State */}
        <div className="px-6">
          {filteredMembers.length === 0 && (
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum membro encontrado</h3>
                  <p className="text-gray-600 mb-4">Não encontramos membros da equipe com os filtros aplicados.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterStatus("all")
                      setFilterRole("all")
                    }}
                    className="bg-white hover:bg-gray-50"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
