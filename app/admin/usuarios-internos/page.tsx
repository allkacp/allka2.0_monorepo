
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, Shield, UserCheck, Clock, Award } from "lucide-react"

interface InternalUser {
  id: string
  name: string
  avatar: string
  email: string
  phone: string
  role: string
  department: string
  status: "active" | "inactive" | "vacation"
  permissions: string[]
  joinDate: string
  lastActive: string
}

export default function UsuariosInternosPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Mock data
  const users: InternalUser[] = [
    {
      id: "1",
      name: "Ana Silva",
      avatar: "/placeholder.svg",
      email: "ana.silva@allka.com",
      phone: "+55 11 98765-4321",
      role: "Gerente de Operações",
      department: "Operações",
      status: "active",
      permissions: ["admin", "users", "projects"],
      joinDate: "2023-01-15",
      lastActive: "2 horas atrás",
    },
    {
      id: "2",
      name: "Carlos Santos",
      avatar: "/placeholder.svg",
      email: "carlos.santos@allka.com",
      phone: "+55 11 91234-5678",
      role: "Desenvolvedor Sênior",
      department: "Tecnologia",
      status: "active",
      permissions: ["projects", "system"],
      joinDate: "2023-03-20",
      lastActive: "30 minutos atrás",
    },
    {
      id: "3",
      name: "Maria Oliveira",
      avatar: "/placeholder.svg",
      email: "maria.oliveira@allka.com",
      phone: "+55 21 99876-5432",
      role: "Analista Financeiro",
      department: "Financeiro",
      status: "vacation",
      permissions: ["finance", "reports"],
      joinDate: "2023-02-10",
      lastActive: "3 dias atrás",
    },
  ]

  const stats = [
    {
      title: "Total de Usuários",
      value: "12",
      icon: Users,
      change: "+2 este mês",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Usuários Ativos",
      value: "10",
      icon: UserCheck,
      change: "83.3% do total",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Departamentos",
      value: "5",
      icon: Award,
      change: "Operações, TI, Financeiro...",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Média de Acesso",
      value: "4.2h",
      icon: Clock,
      change: "Por dia",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      vacation: "bg-blue-100 text-blue-700 border-blue-200",
    }
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      vacation: "Férias",
    }
    return <Badge className={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 bg-muted py-0 px-0">
      <div className="max-w-7xl space-y-6 bg-slate-200 mx-0 my-0 px-0 py-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-2xl">
              Usuários Internos
            </h1>
            <p className="text-slate-600 mt-1">Gerencie os usuários internos da plataforma</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário Interno</DialogTitle>
                <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" placeholder="Ex: Ana Silva" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="usuario@allka.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="+55 11 98765-4321" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <Input id="role" placeholder="Ex: Gerente de Operações" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operations">Operações</SelectItem>
                        <SelectItem value="technology">Tecnologia</SelectItem>
                        <SelectItem value="finance">Financeiro</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="hr">Recursos Humanos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permissions">Permissões</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione as permissões" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="btn-brand">Adicionar Usuário</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Departamentos</SelectItem>
                  <SelectItem value="operations">Operações</SelectItem>
                  <SelectItem value="technology">Tecnologia</SelectItem>
                  <SelectItem value="finance">Financeiro</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="hr">Recursos Humanos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="grid grid-cols-1 gap-6">
          {users.map((user) => (
            <Card key={user.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-16 w-16 border-2 border-slate-200">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-lg">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                        {getStatusBadge(user.status)}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {user.role} • {user.department}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4" />
                          Último acesso: {user.lastActive}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                        <Shield className="h-4 w-4 text-slate-500" />
                        <div className="flex gap-2">
                          {user.permissions.map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
