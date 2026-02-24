
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter, Users, Shield, Mail, Calendar, UserCheck, UserX, Edit, Plus, MoreVertical } from "lucide-react"
import { useAccountType } from "@/contexts/account-type-context"
import type { User } from "@/types/user"

// Mock data para demonstração - substituir por chamadas de API reais
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
  {
    id: 3,
    email: "joao.costa@empresa.com",
    name: "João Costa",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects", "approve_deliveries"],
    is_admin: false,
    is_active: true,
    created_at: "2023-05-22",
    updated_at: "2024-01-15",
  },
  {
    id: 4,
    email: "ana.oliveira@empresa.com",
    name: "Ana Oliveira",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_admin",
    permissions: ["manage_users", "view_projects", "manage_payments"],
    is_admin: true,
    is_active: true,
    created_at: "2023-07-08",
    updated_at: "2024-01-12",
  },
  {
    id: 5,
    email: "pedro.lima@empresa.com",
    name: "Pedro Lima",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects", "view_analytics"],
    is_admin: false,
    is_active: false,
    created_at: "2023-09-14",
    updated_at: "2023-12-20",
  },
]

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [filteredMembers, setFilteredMembers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const { accountType, accountSubType } = useAccountType()

  useEffect(() => {
    // Simular chamada de API
    setTimeout(() => {
      setTeamMembers(mockTeamMembers)
      setFilteredMembers(mockTeamMembers)
      setLoading(false)
    }, 1000)
  }, [])

  useEffect(() => {
    let filtered = teamMembers

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrar por status
    if (filterStatus !== "all") {
      filtered = filtered.filter((member) => (filterStatus === "active" ? member.is_active : !member.is_active))
    }

    // Filtrar por função
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Verificar se o usuário tem acesso (apenas para contas in-house)
  if (accountType !== "empresas" || accountSubType !== "in-house") {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">Acesso Restrito</h3>
                <p className="text-sm text-orange-700">
                  Esta funcionalidade está disponível apenas para contas Empresas In-House.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os membros da sua equipe com acesso à plataforma</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-sm">
            {filteredMembers.length} membros
          </Badge>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Membro
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Membros</p>
                <p className="text-3xl font-bold text-gray-900">{teamMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Membros Ativos</p>
                <p className="text-3xl font-bold text-green-600">{activeMembers.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-3xl font-bold text-purple-600">{adminMembers.length}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inativos</p>
                <p className="text-3xl font-bold text-red-600">{inactiveMembers.length}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Todas as funções</option>
                <option value="company_admin">Administradores</option>
                <option value="company_user">Usuários</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="grid">Visualização em Cards</TabsTrigger>
          <TabsTrigger value="list">Visualização em Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-600 text-white">
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
                      <Badge variant={member.is_active ? "default" : "destructive"}>
                        {member.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getPermissionCount(member.permissions)} permissões
                      </Badge>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
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
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-600 text-white">
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
                        <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                        <Badge variant={member.is_active ? "default" : "destructive"}>
                          {member.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {getPermissionCount(member.permissions)} permissões ativas
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
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

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <Card>
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
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
