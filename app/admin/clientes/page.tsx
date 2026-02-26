
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import {
  Building2,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  Briefcase,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Mock data for clients
const mockClients = {
  company: [
    {
      id: 1,
      name: "Tech Innovations Inc",
      type: "Company",
      email: "contact@techinnovations.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      joinDate: "2024-01-15",
      activeProjects: 8,
      totalSpent: "$125,000",
      status: "active",
    },
    {
      id: 2,
      name: "Global Solutions Ltd",
      type: "Company",
      email: "info@globalsolutions.com",
      phone: "+1 (555) 234-5678",
      location: "New York, NY",
      joinDate: "2024-02-20",
      activeProjects: 5,
      totalSpent: "$89,500",
      status: "active",
    },
    {
      id: 3,
      name: "Digital Ventures Corp",
      type: "Company",
      email: "hello@digitalventures.com",
      phone: "+1 (555) 345-6789",
      location: "Austin, TX",
      joinDate: "2024-03-10",
      activeProjects: 12,
      totalSpent: "$210,000",
      status: "active",
    },
  ],
  agency: [
    {
      id: 4,
      name: "Creative Studio Agency",
      type: "Agency",
      email: "contact@creativestudio.com",
      phone: "+1 (555) 456-7890",
      location: "Los Angeles, CA",
      joinDate: "2024-01-05",
      activeProjects: 15,
      totalSpent: "$180,000",
      status: "active",
    },
    {
      id: 5,
      name: "Marketing Masters",
      type: "Agency",
      email: "info@marketingmasters.com",
      phone: "+1 (555) 567-8901",
      location: "Chicago, IL",
      joinDate: "2024-02-12",
      activeProjects: 10,
      totalSpent: "$145,000",
      status: "active",
    },
  ],
  partner: [
    {
      id: 6,
      name: "Strategic Partners Group",
      type: "Partner",
      email: "partners@strategicgroup.com",
      phone: "+1 (555) 678-9012",
      location: "Boston, MA",
      joinDate: "2024-01-20",
      activeProjects: 20,
      totalSpent: "$350,000",
      status: "active",
    },
    {
      id: 7,
      name: "Enterprise Solutions Partners",
      type: "Partner",
      email: "contact@enterprisepartners.com",
      phone: "+1 (555) 789-0123",
      location: "Seattle, WA",
      joinDate: "2024-02-28",
      activeProjects: 18,
      totalSpent: "$295,000",
      status: "active",
    },
  ],
}

export default function ClientesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const allClients = [...mockClients.company, ...mockClients.agency, ...mockClients.partner]

  const getFilteredClients = () => {
    let clients = allClients
    if (activeTab === "company") clients = mockClients.company
    if (activeTab === "agency") clients = mockClients.agency
    if (activeTab === "partner") clients = mockClients.partner

    if (searchQuery) {
      clients = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return clients
  }

  const filteredClients = getFilteredClients()

  const stats = [
    {
      label: "Total Clientes",
      value: allClients.length,
      icon: Building2,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Companies",
      value: mockClients.company.length,
      icon: Briefcase,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Agencies",
      value: mockClients.agency.length,
      icon: Users,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Partners",
      value: mockClients.partner.length,
      icon: TrendingUp,
      color: "from-orange-500 to-amber-500",
    },
  ]

  return (
    <div className="min-h-screen p-6 px-0 py-0 bg-slate-200">
      <div className="max-w-7xl bg-slate-200 mx-0 my-0 px-0 py-0 space-y-0">
        <PageHeader
          title="Clientes"
          description="Gerencie todos os seus clientes pagantes em um só lugar"
          actions={
            <Button className="btn-brand">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4 border border-gray-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <Card className="p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar clientes por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Tabs and Client List */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="all">Todos ({allClients.length})</TabsTrigger>
            <TabsTrigger value="company">Companies ({mockClients.company.length})</TabsTrigger>
            <TabsTrigger value="agency">Agencies ({mockClients.agency.length})</TabsTrigger>
            <TabsTrigger value="partner">Partners ({mockClients.partner.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredClients.length === 0 ? (
              <Card className="p-12 text-center border border-gray-200">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
                <p className="text-gray-600">Tente ajustar seus filtros ou adicione um novo cliente</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredClients.map((client) => (
                  <Card
                    key={client.id}
                    className="p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-110 transition-transform duration-300">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                          <Badge variant="secondary" className="mt-1">
                            {client.type}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {client.phone}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {client.location}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Desde {new Date(client.joinDate).toLocaleDateString("pt-BR")}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Projetos Ativos</p>
                        <p className="text-lg font-semibold text-gray-900">{client.activeProjects}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Total Investido</p>
                        <p className="text-lg font-semibold text-green-600">{client.totalSpent}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
