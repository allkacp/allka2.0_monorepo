
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"
import {
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  Eye,
} from "lucide-react"

const ledAgencies = [
  {
    id: 1,
    name: "Digital Solutions",
    logo: "/placeholder.svg?height=100&width=100",
    status: "active",
    mrr: 850,
    commission: 42.5,
    projects: 12,
    members: 5,
    location: "São Paulo, SP",
    email: "contato@digitalsolutions.com",
    phone: "(11) 98765-4321",
    joinDate: "2025-01-15",
    growth: 15,
    totalEarned: 425,
    activeProjects: [
      { name: "Website Redesign", value: 5000 },
      { name: "Mobile App", value: 8000 },
      { name: "Brand Identity", value: 3500 },
    ],
  },
  {
    id: 2,
    name: "Creative Hub",
    logo: "/placeholder.svg?height=100&width=100",
    status: "active",
    mrr: 1200,
    commission: 60,
    projects: 18,
    members: 8,
    location: "Rio de Janeiro, RJ",
    email: "hello@creativehub.com",
    phone: "(21) 97654-3210",
    joinDate: "2024-12-10",
    growth: 22,
    totalEarned: 720,
    activeProjects: [
      { name: "E-commerce Platform", value: 12000 },
      { name: "Marketing Campaign", value: 6000 },
      { name: "Social Media", value: 4500 },
    ],
  },
  {
    id: 3,
    name: "Growth Marketing",
    logo: "/placeholder.svg?height=100&width=100",
    status: "active",
    mrr: 950,
    commission: 47.5,
    projects: 15,
    members: 6,
    location: "Belo Horizonte, MG",
    email: "contato@growthmarketing.com",
    phone: "(31) 96543-2109",
    joinDate: "2024-11-20",
    growth: 18,
    totalEarned: 570,
    activeProjects: [
      { name: "SEO Optimization", value: 4000 },
      { name: "Content Strategy", value: 5500 },
      { name: "Analytics Setup", value: 3000 },
    ],
  },
  {
    id: 4,
    name: "Brand Studio",
    logo: "/placeholder.svg?height=100&width=100",
    status: "active",
    mrr: 720,
    commission: 36,
    projects: 10,
    members: 4,
    location: "Curitiba, PR",
    email: "studio@brandstudio.com",
    phone: "(41) 95432-1098",
    joinDate: "2024-10-05",
    growth: 12,
    totalEarned: 432,
    activeProjects: [
      { name: "Logo Design", value: 2500 },
      { name: "Brand Guidelines", value: 4000 },
      { name: "Packaging Design", value: 3500 },
    ],
  },
  {
    id: 5,
    name: "Social Media Pro",
    logo: "/placeholder.svg?height=100&width=100",
    status: "active",
    mrr: 680,
    commission: 34,
    projects: 9,
    members: 3,
    location: "Porto Alegre, RS",
    email: "contato@socialmediapro.com",
    phone: "(51) 94321-0987",
    joinDate: "2024-09-12",
    growth: 10,
    totalEarned: 408,
    activeProjects: [
      { name: "Instagram Management", value: 3000 },
      { name: "Content Creation", value: 4500 },
      { name: "Influencer Campaign", value: 5000 },
    ],
  },
]

const summaryStats = [
  {
    title: "Total de Agências",
    value: "5",
    subtitle: "Sob sua liderança",
    icon: Building2,
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "MRR Total",
    value: "R$ 4.4k",
    subtitle: "Receita combinada",
    icon: DollarSign,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Comissão Mensal",
    value: "R$ 220",
    subtitle: "5% de cada agência",
    icon: TrendingUp,
    color: "from-purple-500 to-purple-600",
  },
  {
    title: "Projetos Ativos",
    value: "64",
    subtitle: "Total das agências",
    icon: Briefcase,
    color: "from-amber-500 to-amber-600",
  },
]

export default function AgenciasLideradasPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgency, setSelectedAgency] = useState<(typeof ledAgencies)[0] | null>(null)

  const filteredAgencies = ledAgencies.filter((agency) => agency.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 py-0 px-0">
        {/* Page Header */}
        <PageHeader
          title="Agências Lideradas"
          description="Gerencie e acompanhe o desempenho das agências sob sua liderança"
          actions={
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg gap-2">
              <Building2 className="h-4 w-4" />
              Convidar Agência
            </Button>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map((stat, index) => (
            <Card
              key={index}
              className={`bg-gradient-to-br ${stat.color} text-white border-0 shadow-lg hover:shadow-xl transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium opacity-90">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-sm opacity-75 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className="ml-4">
                    <stat.icon className="h-10 w-10 opacity-80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar agências..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agencies List */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {filteredAgencies.map((agency) => (
            <Card
              key={agency.id}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Agency Logo */}
                  <Avatar className="h-16 w-16 border-2 border-slate-200 dark:border-slate-700 shadow-md">
                    <AvatarImage src={agency.logo || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                      {agency.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Agency Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{agency.name}</h3>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ativa</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {agency.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {agency.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {agency.phone}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 hover:border-blue-300 bg-transparent"
                        onClick={() => setSelectedAgency(agency)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver Detalhes
                      </Button>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">MRR</p>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">R$ {agency.mrr}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />+{agency.growth}%
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Sua Comissão</p>
                        <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                          R$ {agency.commission}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">5% mensal</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Projetos</p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{agency.projects}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Ativos</p>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Equipe</p>
                        <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{agency.members}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Membros</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">Membro desde</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {new Date(agency.joinDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Data de entrada</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Commission Summary */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold opacity-90 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Resumo de Comissões
                </h3>
                <p className="text-3xl font-bold mt-2">R$ 220,00/mês</p>
                <p className="text-sm opacity-75 mt-1">Total de comissões das 5 agências lideradas</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm opacity-90">Próximo pagamento</p>
                <p className="text-2xl font-bold mt-1">31 Jan 2026</p>
                <Button variant="outline" className="mt-3 bg-white text-emerald-600 hover:bg-slate-50 border-0">
                  Ver Histórico
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agency Details Modal */}
      <Dialog open={selectedAgency !== null} onOpenChange={() => setSelectedAgency(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-slate-200 dark:border-slate-700">
                <AvatarImage src={selectedAgency?.logo || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  {selectedAgency?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {selectedAgency?.name}
            </DialogTitle>
            <DialogDescription>Detalhes completos da agência liderada</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Contact Info */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Informações de Contato
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {selectedAgency?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Phone className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Telefone</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedAgency?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <MapPin className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Localização</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedAgency?.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Membro desde</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedAgency && new Date(selectedAgency.joinDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Desempenho
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <DollarSign className="h-6 w-6 text-blue-500 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">MRR</p>
                  <p className="text-2xl font-bold text-blue-600">R$ {selectedAgency?.mrr}</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <Award className="h-6 w-6 text-emerald-500 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sua Comissão</p>
                  <p className="text-2xl font-bold text-emerald-600">R$ {selectedAgency?.commission}</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <Briefcase className="h-6 w-6 text-purple-500 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Projetos</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedAgency?.projects}</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <Users className="h-6 w-6 text-amber-500 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Equipe</p>
                  <p className="text-2xl font-bold text-amber-600">{selectedAgency?.members}</p>
                </div>
              </div>
            </div>

            {/* Growth */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Crescimento</h4>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Taxa de Crescimento</span>
                  <span className="text-sm font-bold text-emerald-600">+{selectedAgency?.growth}%</span>
                </div>
                <Progress value={selectedAgency?.growth || 0} className="h-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Crescimento nos últimos 3 meses</p>
              </div>
            </div>

            {/* Active Projects */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-500" />
                Principais Projetos Ativos
              </h4>
              <div className="space-y-2">
                {selectedAgency?.activeProjects.map((project, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{project.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      R$ {project.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Ganho com esta Agência</p>
                  <p className="text-3xl font-bold mt-1">R$ {selectedAgency?.totalEarned.toLocaleString("pt-BR")}</p>
                  <p className="text-sm opacity-75 mt-1">
                    Desde {selectedAgency && new Date(selectedAgency.joinDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Award className="h-12 w-12 opacity-80" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAgency(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
