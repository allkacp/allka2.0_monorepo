import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
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
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClients } from "@/hooks/useClients";
import { PageLoader } from "@/components/ui/loading";

export default function ClientesPage() {
  const { clients: allApiClients, loading, error } = useClients();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Group by type (segment or type field from API)
  const companyClients = allApiClients.filter(
    (c: any) =>
      (c.segment || c.type || "company").toLowerCase().includes("company") ||
      (c.segment || c.type || "company").toLowerCase().includes("empresa"),
  );
  const agencyClients = allApiClients.filter((c: any) =>
    (c.segment || c.type || "").toLowerCase().includes("agenc"),
  );
  const partnerClients = allApiClients.filter(
    (c: any) =>
      (c.segment || c.type || "").toLowerCase().includes("partner") ||
      (c.segment || c.type || "").toLowerCase().includes("parceiro"),
  );
  // Anything not matching goes into company bucket
  const unmatchedClients = allApiClients.filter(
    (c: any) =>
      !agencyClients.includes(c) &&
      !partnerClients.includes(c) &&
      !companyClients.includes(c),
  );
  const allCompanyClients = [...companyClients, ...unmatchedClients];

  const getFilteredClients = () => {
    let clients: any[] = allApiClients;
    if (activeTab === "company") clients = allCompanyClients;
    if (activeTab === "agency") clients = agencyClients;
    if (activeTab === "partner") clients = partnerClients;

    if (searchQuery) {
      clients = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return clients;
  };

  const filteredClients = getFilteredClients();

  const stats = [
    {
      label: "Total Clientes",
      value: allApiClients.length,
      icon: Building2,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Companies",
      value: allCompanyClients.length,
      icon: Briefcase,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Agencies",
      value: agencyClients.length,
      icon: Users,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Partners",
      value: partnerClients.length,
      icon: TrendingUp,
      color: "from-orange-500 to-amber-500",
    },
  ];

  if (loading) return <PageLoader text="Carregando clientes…" />;

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar clientes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {typeof error === "string"
              ? error
              : "Não foi possível carregar os clientes."}
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen p-6 px-0 py-0 bg-slate-200 dark:bg-transparent">
      <div className="max-w-7xl bg-slate-200 dark:bg-transparent mx-0 my-0 px-0 py-0 space-y-0">
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
            <Card
              key={index}
              className="p-4 border border-gray-200 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
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
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-gray-100 dark:bg-[oklch(0.21_0.018_258)]">
            <TabsTrigger value="all">
              Todos ({allApiClients.length})
            </TabsTrigger>
            <TabsTrigger value="company">
              Companies ({allCompanyClients.length})
            </TabsTrigger>
            <TabsTrigger value="agency">
              Agencies ({agencyClients.length})
            </TabsTrigger>
            <TabsTrigger value="partner">
              Partners ({partnerClients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredClients.length === 0 ? (
              <Card className="p-12 text-center border border-gray-200">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-gray-600">
                  Tente ajustar seus filtros ou adicione um novo cliente
                </p>
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
                          <h3 className="text-lg font-semibold text-gray-900">
                            {client.name}
                          </h3>
                          <Badge variant="secondary" className="mt-1">
                            {client.type}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
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
                        Desde{" "}
                        {new Date(client.joinDate).toLocaleDateString("pt-BR")}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Projetos Ativos</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {client.activeProjects}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Total Investido</p>
                        <p className="text-lg font-semibold text-green-600">
                          {client.totalSpent}
                        </p>
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
  );
}
