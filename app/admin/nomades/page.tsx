import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Eye,
  Edit,
  Star,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  MessageCircle,
  Mail,
  Loader2,
} from "lucide-react";
import { NomadMetricsWidgets } from "@/components/admin/nomad-metrics-widgets";
import { NomadViewModal } from "@/components/admin/nomad-view-modal";
import { NomadEditModal } from "@/components/admin/nomad-edit-modal";
import { PageHeader } from "@/components/page-header";
import { useNomades } from "@/hooks/useNomades";

const NOMAD_LEVEL_BADGE: Record<string, { icon: string; className: string }> = {
  Bronze: {
    icon: "🥉",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  Silver: {
    icon: "🥈",
    className: "bg-slate-100 text-slate-600 border-slate-300",
  },
  Gold: {
    icon: "🥇",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  Platinum: { icon: "💎", className: "bg-sky-50 text-sky-700 border-sky-200" },
  Diamond: {
    icon: "👑",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  Leader: { icon: "🔥", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

const NOMAD_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  cadastrado: {
    label: "Cadastrado",
    className: "bg-slate-100 text-slate-700 border-slate-300",
  },
  teste_pendente: {
    label: "Teste Pendente",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  ativo: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  active: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  atencao: {
    label: "Atenção",
    className: "bg-orange-100 text-orange-800 border-orange-300",
  },
  sem_tarefas: {
    label: "Sem Tarefas",
    className: "bg-sky-100 text-sky-800 border-sky-300",
  },
  inativo: {
    label: "Inativo",
    className: "bg-gray-100 text-gray-600 border-gray-300",
  },
  inactive: {
    label: "Inativo",
    className: "bg-gray-100 text-gray-600 border-gray-300",
  },
  reprovado: {
    label: "Reprovado",
    className: "bg-red-100 text-red-700 border-red-300",
  },
};

const availableProducts = [
  "Marketing Digital",
  "Branding",
  "Desenvolvimento",
  "SEO",
  "Conteúdo",
];
const availableCategories = [
  "Design",
  "Marketing",
  "Tecnologia",
  "Comunicação",
];
const availableTaskTypes = [
  "Criação de Posts",
  "Design de Logos",
  "Desenvolvimento Frontend",
  "Otimização SEO",
  "Redação de Artigos",
  "Criação de Textos",
];

export default function AdminNomadesPage() {
  const { nomades: apiNomades, loading, error, updateNomade } = useNomades();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterOnlineStatus, setFilterOnlineStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterLastAccessFrom, setFilterLastAccessFrom] = useState("");
  const [filterLastAccessTo, setFilterLastAccessTo] = useState("");
  const [filterProducts, setFilterProducts] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterTaskTypes, setFilterTaskTypes] = useState<string[]>([]);
  const [selectedNomad, setSelectedNomad] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [invitedNomads, setInvitedNomads] = useState<Set<number>>(new Set());

  const handleInvite = (nomadId: number) => {
    setInvitedNomads((prev) => new Set([...prev, nomadId]));
  };

  const filteredNomades = apiNomades.filter((nomade: any) => {
    const matchesSearch =
      nomade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomade.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || nomade.level === filterLevel;
    const matchesStatus =
      filterStatus === "all" || nomade.status === filterStatus;
    const matchesOnlineStatus =
      filterOnlineStatus === "all" ||
      nomade.online_status === filterOnlineStatus;

    // Filter by registration date range
    const matchesDateFrom =
      !filterDateFrom ||
      new Date(nomade.joinedDate) >= new Date(filterDateFrom);
    const matchesDateTo =
      !filterDateTo || new Date(nomade.joinedDate) <= new Date(filterDateTo);

    // Filter by last access date range
    const matchesLastAccessFrom =
      !filterLastAccessFrom ||
      new Date(nomade.last_login) >= new Date(filterLastAccessFrom);
    const matchesLastAccessTo =
      !filterLastAccessTo ||
      new Date(nomade.last_login) <= new Date(filterLastAccessTo);

    const matchesProducts =
      filterProducts.length === 0 ||
      filterProducts.some((product) => nomade.products.includes(product));
    const matchesCategories =
      filterCategories.length === 0 ||
      filterCategories.some((category) => nomade.categories.includes(category));
    const matchesTaskTypes =
      filterTaskTypes.length === 0 ||
      filterTaskTypes.some((taskType) => nomade.taskTypes.includes(taskType));

    return (
      matchesSearch &&
      matchesLevel &&
      matchesStatus &&
      matchesOnlineStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesLastAccessFrom &&
      matchesLastAccessTo &&
      matchesProducts &&
      matchesCategories &&
      matchesTaskTypes
    );
  });

  const clearAdvancedFilters = () => {
    setFilterOnlineStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterLastAccessFrom("");
    setFilterLastAccessTo("");
    setFilterProducts([]);
    setFilterCategories([]);
    setFilterTaskTypes([]);
  };

  const toggleProduct = (product: string) => {
    setFilterProducts((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product],
    );
  };

  const toggleCategory = (category: string) => {
    setFilterCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const toggleTaskType = (taskType: string) => {
    setFilterTaskTypes((prev) =>
      prev.includes(taskType)
        ? prev.filter((t) => t !== taskType)
        : [...prev, taskType],
    );
  };

  const handleView = (nomad: any) => {
    setSelectedNomad(nomad);
    setIsViewModalOpen(true);
  };

  const handleEdit = (nomad: any) => {
    setSelectedNomad(nomad);
    setIsEditModalOpen(true);
  };

  const handleSave = async (updatedNomad: any) => {
    if (updatedNomad.id)
      await updateNomade(String(updatedNomad.id), updatedNomad);
  };

  const handlePhoneCall = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`tel:${cleanPhone}`, "_self");
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, "_self");
  };

  const getOnlineStatusIndicator = (status: string) => {
    switch (status) {
      case "online":
        return (
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900"></div>
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75"></div>
          </div>
        );
      case "offline":
        return (
          <div className="h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white dark:ring-gray-900"></div>
        );
      case "busy":
        return (
          <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></div>
        );
      case "away":
        return (
          <div className="h-3 w-3 rounded-full bg-yellow-500 ring-2 ring-white dark:ring-gray-900"></div>
        );
      default:
        return (
          <div className="h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white dark:ring-gray-900"></div>
        );
    }
  };

  const getOnlineStatusLabel = (status: string) => {
    switch (status) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      case "busy":
        return "Ocupado";
      case "away":
        return "Ausente";
      default:
        return "Desconhecido";
    }
  };

  if (loading)
    return (
      <div className="container mx-auto px-0 py-0 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (error)
    return (
      <div className="container mx-auto px-0 py-0 flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Erro ao carregar nômades: {error}</p>
      </div>
    );

  return (
    <div className="container mx-auto px-0 py-0 space-y-5">
      <PageHeader
        title="Gestão de Nômades"
        description="Gerencie todos os nômades da plataforma"
      />

      <NomadMetricsWidgets />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="all">Todos os níveis</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Diamond">Diamond</option>
                  <option value="Leader">Leader</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="all">Todos os status</option>
                  <option value="cadastrado">Cadastrado</option>
                  <option value="teste_pendente">Teste Pendente</option>
                  <option value="ativo">Ativo</option>
                  <option value="atencao">Atenção</option>
                  <option value="sem_tarefas">Sem Tarefas</option>
                  <option value="inativo">Inativo</option>
                  <option value="reprovado">Reprovado</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center space-x-2"
                >
                  <span>Filtros Avançados</span>
                  {showAdvancedFilters ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Filtros Avançados</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAdvancedFilters}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar Filtros
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Online Status Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Status Online
                    </label>
                    <select
                      value={filterOnlineStatus}
                      onChange={(e) => setFilterOnlineStatus(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    >
                      <option value="all">Todos</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="busy">Ocupado</option>
                      <option value="away">Ausente</option>
                    </select>
                  </div>

                  {/* Registration Date From */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Cadastro De
                    </label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Registration Date To */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Cadastro Até
                    </label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Last Access From */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Último Acesso De
                    </label>
                    <Input
                      type="date"
                      value={filterLastAccessFrom}
                      onChange={(e) => setFilterLastAccessFrom(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Last Access To */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Último Acesso Até
                    </label>
                    <Input
                      type="date"
                      value={filterLastAccessTo}
                      onChange={(e) => setFilterLastAccessTo(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  {/* Products Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Produtos
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableProducts.map((product) => (
                        <Badge
                          key={product}
                          variant={
                            filterProducts.includes(product)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => toggleProduct(product)}
                        >
                          {product}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Categories Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Categorias
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableCategories.map((category) => (
                        <Badge
                          key={category}
                          variant={
                            filterCategories.includes(category)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-purple-100 transition-colors"
                          onClick={() => toggleCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Task Types Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tipos de Tarefa
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTaskTypes.map((taskType) => (
                        <Badge
                          key={taskType}
                          variant={
                            filterTaskTypes.includes(taskType)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-green-100 transition-colors"
                          onClick={() => toggleTaskType(taskType)}
                        >
                          {taskType}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {filteredNomades.length} nômade(s) encontrado(s)
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nomades List */}
      <div className="grid gap-0">
        {filteredNomades.map((nomade) => (
          <Card key={nomade.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 pt-1.5">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {nomade.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="absolute -bottom-0.5 -right-0.5"
                      title={getOnlineStatusLabel(nomade.online_status)}
                    >
                      {getOnlineStatusIndicator(nomade.online_status)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-base leading-none">
                        {nomade.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs py-0 ${(NOMAD_LEVEL_BADGE[nomade.level] ?? NOMAD_LEVEL_BADGE["Bronze"]).className}`}
                      >
                        {
                          (
                            NOMAD_LEVEL_BADGE[nomade.level] ??
                            NOMAD_LEVEL_BADGE["Bronze"]
                          ).icon
                        }{" "}
                        {nomade.level}
                      </Badge>
                      {(() => {
                        const sc = NOMAD_STATUS_CONFIG[nomade.status] || {
                          label: nomade.status,
                          className:
                            "bg-gray-100 text-gray-600 border-gray-300",
                        };
                        return (
                          <Badge
                            variant="outline"
                            className={`text-xs py-0 ${sc.className}`}
                          >
                            {sc.label}
                          </Badge>
                        );
                      })()}
                      {invitedNomads.has(nomade.id) && (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs py-0">
                          Convite Enviado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-none">
                      {nomade.email}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-600">
                      <span>
                        Especialidades: {nomade.specialties.join(", ")}
                      </span>
                    </div>
                    {nomade.phone && (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => handlePhoneCall(nomade.phone)}
                          className="p-1 hover:bg-green-100 rounded-md transition-colors"
                          title="Ligar"
                        >
                          <Phone className="h-5 w-5 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(nomade.phone)}
                          className="p-1 hover:bg-green-100 rounded-md transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-5 w-5 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleEmail(nomade.email)}
                          className="p-1 hover:bg-blue-100 rounded-md transition-colors"
                          title="Enviar Email"
                        >
                          <Mail className="h-5 w-5 text-blue-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-600 leading-none">
                      Tarefas Concluídas
                    </p>
                    <p className="text-lg font-bold leading-tight">
                      {nomade.tasksCompleted}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 leading-none">
                      Avaliação
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <p className="text-lg font-bold leading-tight">
                        {nomade.rating}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 leading-none">Ganhos</p>
                    <p className="text-lg font-bold text-green-600 leading-tight">
                      R$ {nomade.earnings.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => handleView(nomade)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => handleEdit(nomade)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View and Edit Modals */}
      {selectedNomad && (
        <>
          <NomadViewModal
            nomad={selectedNomad}
            open={isViewModalOpen}
            onOpenChange={setIsViewModalOpen}
            onEdit={() => {
              setIsViewModalOpen(false);
              setIsEditModalOpen(true);
            }}
            onInvite={handleInvite}
          />
          <NomadEditModal
            nomad={selectedNomad}
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  );
}
