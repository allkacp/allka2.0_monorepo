
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Users,
  TrendingUp,
  DollarSign,
  Star,
} from "lucide-react"

interface Agency {
  id: string
  name: string
  logo: string
  email: string
  phone: string
  location: string
  plan: string
  status: "active" | "inactive" | "pending"
  teamSize: number
  activeProjects: number
  totalRevenue: number
  level: string
}

export default function AgenciasPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Mock data
  const agencies: Agency[] = [
    {
      id: "1",
      name: "Digital Innovations",
      logo: "/placeholder.svg",
      email: "contact@digitalinnovations.com",
      phone: "+55 11 98765-4321",
      location: "São Paulo, SP",
      plan: "Premium",
      status: "active",
      teamSize: 15,
      activeProjects: 8,
      totalRevenue: 125000,
      level: "Gold",
    },
    {
      id: "2",
      name: "Creative Studio",
      logo: "/placeholder.svg",
      email: "hello@creativestudio.com",
      phone: "+55 21 91234-5678",
      location: "Rio de Janeiro, RJ",
      plan: "Business",
      status: "active",
      teamSize: 8,
      activeProjects: 5,
      totalRevenue: 75000,
      level: "Silver",
    },
    {
      id: "3",
      name: "Tech Solutions",
      logo: "/placeholder.svg",
      email: "info@techsolutions.com",
      phone: "+55 11 99876-5432",
      location: "São Paulo, SP",
      plan: "Starter",
      status: "pending",
      teamSize: 5,
      activeProjects: 2,
      totalRevenue: 35000,
      level: "Bronze",
    },
  ]

  const stats = [
    {
      title: "Total de Agências",
      value: "32",
      icon: Building2,
      change: "+3 este mês",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Agências Ativas",
      value: "28",
      icon: TrendingUp,
      change: "87.5% do total",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Equipes Totais",
      value: "245",
      icon: Users,
      change: "+12 este mês",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Receita Total",
      value: "R$ 2.4M",
      icon: DollarSign,
      change: "+18% vs mês anterior",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    }
    const labels = {
      active: "Ativa",
      inactive: "Inativa",
      pending: "Pendente",
    }
    return <Badge className={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const getLevelBadge = (level: string) => {
    const variants = {
      Gold: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
      Silver: "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
      Bronze: "bg-gradient-to-r from-orange-400 to-orange-600 text-white",
    }
    return (
      <Badge className={variants[level as keyof typeof variants]}>
        <Star className="h-3 w-3 mr-1" />
        {level}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-transparent dark:via-transparent dark:to-transparent p-6 bg-slate-200 dark:bg-transparent px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 dark:bg-transparent px-0 py-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gestão de Agências
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie todas as agências parceiras da plataforma</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand">
                <Plus className="h-4 w-4 mr-2" />
                Nova Agência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Agência</DialogTitle>
                <DialogDescription>Preencha os dados da nova agência parceira</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Agência</Label>
                    <Input id="name" placeholder="Ex: Digital Innovations" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="contato@agencia.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="+55 11 98765-4321" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Localização</Label>
                    <Input id="location" placeholder="São Paulo, SP" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan">Plano</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lite">Lite — R$ 300/mês</SelectItem>
                        <SelectItem value="start">Start — R$ 500/mês</SelectItem>
                        <SelectItem value="standard">Standard — R$ 1.000/mês</SelectItem>
                        <SelectItem value="growth">Growth — R$ 1.500/mês</SelectItem>
                        <SelectItem value="scale">Scale — R$ 3.000/mês</SelectItem>
                        <SelectItem value="squad">Squad — R$ 5.000/mês</SelectItem>
                        <SelectItem value="enterprise">Enterprise — R$ 5.000/mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Tamanho da Equipe</Label>
                    <Input id="teamSize" type="number" placeholder="10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" placeholder="Breve descrição da agência..." rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="btn-brand">Adicionar Agência</Button>
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
                  placeholder="Buscar agências..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Agencies List */}
        <div className="grid grid-cols-1 gap-6">
          {agencies.map((agency) => (
            <Card key={agency.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-16 w-16 border-2 border-slate-200">
                      <AvatarImage src={agency.logo || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                        <Building2 className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{agency.name}</h3>
                        {getStatusBadge(agency.status)}
                        {getLevelBadge(agency.level)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4" />
                          {agency.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          {agency.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-4 w-4" />
                          {agency.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Badge variant="outline">{agency.plan}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                        <div>
                          <p className="text-xs text-slate-500">Equipe</p>
                          <p className="text-sm font-semibold text-slate-900">{agency.teamSize} membros</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Projetos Ativos</p>
                          <p className="text-sm font-semibold text-slate-900">{agency.activeProjects}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Receita Total</p>
                          <p className="text-sm font-semibold text-slate-900">
                            R$ {(agency.totalRevenue / 1000).toFixed(0)}k
                          </p>
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
