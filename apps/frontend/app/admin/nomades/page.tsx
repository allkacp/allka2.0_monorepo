import { useState, useMemo } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { NomadMetricsWidgets } from "@/components/admin/nomad-metrics-widgets";
import { NomadViewModal } from "@/components/admin/nomad-view-modal";
import { NomadEditModal } from "@/components/admin/nomad-edit-modal";
import { PageHeader } from "@/components/page-header";
import { useNomades } from "@/hooks/useNomades";
import { PageLoader } from "@/components/ui/loading";
import { LegacyIdBadge } from "@/components/legacy-id-badge";

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

// As listas fixas de produtos/categorias/tipos de tarefa que existiam aqui
// alimentavam filtros que não filtravam nada — comparavam com campos que a
// API não devolve. Foram substituídas pelo filtro de área de habilitação,
// montado a partir dos dados reais que chegam em GET /api/nomades.

// Status que a lista esconde por padrão (ver filterStatus === "em_operacao").
const FORA_DE_OPERACAO = new Set(["inativo", "reprovado"]);

export default function AdminNomadesPage() {
  // `limit: 500` porque TODA a filtragem desta tela é client-side (busca,
  // nível, status, datas) e a API pagina em 20 por padrão. O efeito era a
  // lista aparecer vazia: os 20 primeiros que a API devolve são todos
  // `inativo`, e o filtro padrão ("Em operação") esconde exatamente esses —
  // sobrava zero card com 397 nômades no banco. 500 é o teto do backend
  // (parsePagination) e cobre o cadastro inteiro com folga.
  const { nomades: nomadesDaApi, loading, error, updateNomade } = useNomades({ limit: "500" });

  /**
   * Normaliza a resposta da API para o formato que os cards desta tela
   * esperam.
   *
   * A tela foi escrita contra um mock com 11 campos que
   * `GET /api/nomades` nunca devolveu — `earnings`, `rating`,
   * `tasksCompleted`, `phone`, `joinedDate`, `last_login`, `specialties`,
   * `products`, `categories`, `taskTypes`, `online_status`. Como a lista
   * aparecia vazia (a página 1 da API só traz inativos, escondidos pelo filtro
   * padrão), nada disso chegava a ser lido e a incompatibilidade ficou
   * invisível; ao carregar a lista de verdade, o primeiro `.join` numa dessas
   * derrubava a página inteira.
   *
   * A conversão fica aqui, num lugar só, em vez de espalhar `?.` por trinta
   * pontos do JSX. O que não existe no modelo (ganhos por nômade, status
   * online) vira valor neutro — não há de onde tirar.
   */
  const apiNomades = useMemo(
    () =>
      (nomadesDaApi ?? []).map((n: any) => ({
        ...n,
        phone: n.whatsapp ?? "",
        rating: n.performance_avg_rating ?? 0,
        tasksCompleted: n.tasks_completed_total ?? 0,
        joinedDate: n.registration_date ?? n.created_at ?? null,
        last_login: n.last_access ?? null,
        // Sem equivalente no modelo: Nomade não guarda faturamento nem
        // presença online.
        earnings: 0,
        online_status: n.online_status ?? null,
        // Áreas viraram habilitações (NomadeHabilidade), que não vêm nesta
        // rota — ver a aba Habilitações do modal, que busca à parte. O que dá
        // para mostrar aqui é `areas_of_interest`, que vem do import como um
        // JSON em texto (`["Design e Multimedia","Soluções Web"]`) e sairia
        // cru na tela se não fosse convertido em lista.
        specialties: (() => {
          const bruto = n.areas_of_interest;
          if (!bruto) return [];
          if (Array.isArray(bruto)) return bruto.map(String);
          try {
            const v = JSON.parse(bruto);
            return Array.isArray(v) ? v.map(String) : [String(bruto)];
          } catch {
            return [String(bruto)];
          }
        })(),
        products: [],
        categories: [],
        taskTypes: [],
      })),
    [nomadesDaApi],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  // Padrão da plataforma: a lista esconde quem está fora de operação. Aqui
  // não basta "status === ativo" — cadastrado/teste pendente/atenção também
  // são gente em atividade; o que se esconde por padrão é inativo e
  // reprovado. "Todos os status" continua mostrando tudo.
  const [filterStatus, setFilterStatus] = useState("em_operacao");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterLastAccessFrom, setFilterLastAccessFrom] = useState("");
  const [filterLastAccessTo, setFilterLastAccessTo] = useState("");
  // Área de habilitação — substitui os antigos filtros de produtos/categorias/
  // tipos de tarefa, que liam campos inexistentes na resposta da API.
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
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
      filterStatus === "all"
        ? true
        : filterStatus === "em_operacao"
          ? !FORA_DE_OPERACAO.has(nomade.status)
          : nomade.status === filterStatus;
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

    const matchesAreas =
      filterAreas.length === 0 ||
      filterAreas.some((area) => (nomade.areas ?? []).includes(area));

    return (
      matchesSearch &&
      matchesLevel &&
      matchesStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesLastAccessFrom &&
      matchesLastAccessTo &&
      matchesAreas
    );
  });

  /** Áreas que aparecem de fato entre os nômades carregados. */
  const areasDisponiveis = useMemo(
    () => [...new Set(apiNomades.flatMap((n: any) => n.areas ?? []))].sort() as string[],
    [apiNomades],
  );

  const clearAdvancedFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterLastAccessFrom("");
    setFilterLastAccessTo("");
    setFilterAreas([]);
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

  if (loading) return <PageLoader text="Carregando nômades…" />;

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar nômades
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {error}
          </p>
        </div>
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
                  autoComplete="new-password"
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
                  <option value="em_operacao">Em operação (padrão)</option>
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

                {/*
                  Havia um filtro "Status Online" aqui. A plataforma não
                  registra presença de nômade em lugar nenhum — o campo
                  `online_status` não existe no modelo nem na resposta da API,
                  então o seletor nunca mudou a lista. Removido em vez de
                  mantido como enfeite.
                */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/*
                  Filtro por ÁREA DE HABILITAÇÃO.

                  Substitui três filtros que não filtravam nada: Produtos,
                  Categorias e Tipos de Tarefa liam campos (`products`,
                  `categories`, `taskTypes`) que GET /api/nomades nunca
                  devolveu — clicar nos badges não mudava a lista.

                  Área é o dado real equivalente: é o que a seleção automática
                  usa para escolher quem recebe cada tarefa
                  (src/lib/selecionar-nomade.ts).
                */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Área de habilitação
                    </label>
                    {areasDisponiveis.length === 0 ? (
                      <p className="text-xs text-muted-foreground/70">
                        Nenhum nômade habilitado ainda. As habilitações são
                        cadastradas na aba “Habilitações” de cada nômade.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {areasDisponiveis.map((area) => (
                          <Badge
                            key={area}
                            variant={filterAreas.includes(area) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() =>
                              setFilterAreas((prev) =>
                                prev.includes(area)
                                  ? prev.filter((a) => a !== area)
                                  : [...prev, area],
                              )
                            }
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    )}
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
                      <LegacyIdBadge legacyId={nomade.legacy_id} entidade="nômade" />
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
                    {/*
                      `specialties` NÃO vem de GET /api/nomades — o card foi
                      escrito para um formato que a API nunca devolveu, e o
                      `.join` sem guarda derrubava a página inteira. Ficou
                      escondido enquanto a lista aparecia vazia (a página 1 da
                      API só traz inativos, que o filtro padrão esconde);
                      assim que a lista passou a carregar de fato, quebrou.
                      Áreas de interesse é o campo equivalente que existe.
                    */}
                    <div className="flex gap-4 mt-1 text-xs text-gray-600">
                      <span>
                        Áreas:{" "}
                        {Array.isArray(nomade.specialties) && nomade.specialties.length
                          ? nomade.specialties.join(", ")
                          : (nomade.areas_of_interest || "—")}
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
