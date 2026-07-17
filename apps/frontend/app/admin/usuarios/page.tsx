// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { useNavigate, useParams } from "react-router-dom";
import { ButtonLoader, PageLoader } from "@/components/ui/loading";
import {
  STANDARD_SHELL_PANEL_CLASS,
  STANDARD_SHELL_TABLE_CARD_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { ExportButton } from "@/components/export-button";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { useConsumePendingActivation } from "@/contexts/open-screens-context";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  UserX,
  Shield,
  Eye,
  Phone,
  MessageCircle,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Trash2,
  AlertCircle,
  Edit,
  Key,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Check,
  Copy,
  Plus,
  Cog,
  Activity,
  Info,
  Download,
  ImageDown,
  GripVertical,
  Pencil,
  AlertTriangle,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import type { User } from "@/types/user";
import { UserViewSlidePanel } from "@/components/user-view-slide-panel";
import { SlidePanel } from "@/components/slide-panel";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { UserCreateSlidePanel } from "@/components/user-create-slide-panel";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createPortal } from "react-dom";
import { usePlatformUsers } from "@/contexts/platform-users-context";
import { apiClient } from "@/lib/api-client";
import { useUsers } from "@/hooks/useUsers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";

type ColKey = "codigo" | "usuario" | "contato" | "tipo_funcao" | "vinculo" | "status" | "ultimo_acesso";
const ALL_COLUMNS: { key: ColKey; label: string; info: string }[] = [
  { key: "codigo", label: "ID", info: "ID público sequencial do usuário (ex.: User_00001). Não é o id técnico." },
  { key: "usuario", label: "Usuário", info: "Nome, e-mail e status de presença do usuário." },
  { key: "contato", label: "Contato", info: "Atalhos para ligar ou chamar no WhatsApp." },
  { key: "tipo_funcao", label: "Tipo / Função", info: "Tipo de conta, função na plataforma e sinalizações de LGPD." },
  { key: "vinculo", label: "Conta vinculada", info: "Agency, Company, Partner ou Nômade ao qual este usuário está vinculado." },
  { key: "status", label: "Status", info: "Situação da conta: ativo, bloqueado ou pausado automaticamente." },
  { key: "ultimo_acesso", label: "Último Acesso", info: "Data do último login e tempo de inatividade." },
];
const DEFAULT_VISIBLE: ColKey[] = ["codigo", "usuario", "contato", "tipo_funcao", "vinculo", "status", "ultimo_acesso"];

// ── Conta vinculada (Agency/Company/Partner/Nômade) ────────────────────────
const LINK_TYPE_LABEL: Record<string, string> = {
  admin: "Admin",
  agency: "Agency",
  company: "Company",
  partner: "Partner",
  leader: "Leader",
  nomad: "Nômade",
};

// Fonte da verdade: has_profile_link/profile_link_type/profile_link_name,
// calculados no backend (GET /api/admin/users). "unknown" = account_type
// sem regra definida — não confundir com "sem vínculo" (tipo conhecido,
// vínculo não encontrado).
function getLinkedAccount(user: any): { type: string; name: string } | null | "unknown" {
  if (user.profile_link_type === "unknown") return "unknown";
  if (!user.has_profile_link) return null;
  const type = LINK_TYPE_LABEL[user.profile_link_type as string] ?? user.profile_link_type;
  return { type, name: user.profile_link_name || type };
}

// ── Inactivity bucket helper ───────────────────────────────────────────────
function computeInactivityBucket(lastLogin?: string | null): string {
  if (!lastLogin) return "never";
  const diffDays = Math.floor(
    (Date.now() - new Date(lastLogin).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "today";
  if (diffDays < 7) return "7days";
  if (diffDays < 30) return "30days";
  if (diffDays < 60) return "inactive_30";
  if (diffDays < 90) return "inactive_60";
  return "inactive_90";
}

// Extrai o número de "User_00001" → 1, pra usar na URL em vez do id técnico
// (CUID) — mesmo espírito do padrão já usado em admin/empresas (id local
// sequencial na URL, não o _apiId).
function userCodeToNum(code?: string | null): number | null {
  const m = /(\d+)\s*$/.exec(code || "");
  return m ? parseInt(m[1], 10) : null;
}

export default function UsuariosPage() {
  const { addUser: addPlatformUser, updateUser: updatePlatformUser } =
    usePlatformUsers();
  // Filtro de status é resolvido no backend (is_active=true/false), não só
  // no array em memória — evita a tela carregar/mostrar os 129 quando o
  // padrão devia ser só os ativos. "all" = sem parâmetro is_active.
  const [statusFilter, setStatusFilter] = useState("active");
  const {
    users: apiUsers,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    createUser,
    updateUser,
    deleteUser: apiDeleteUser,
  } = useUsers({
    admin: true,
    limit: 1000,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
  });
  const { toast } = useToast();
  const { sidebarWidth, sidebarSettings, previewTheme } = useSidebar();
  const { headerHeight: infoModalHeaderHeight } = useAppFrameMetrics();
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([usersLoading, visibleCols.size]);
  const getHeaderStyle = () => {
    const theme = previewTheme || sidebarSettings;
    const bg = theme?.backgroundColor;
    if (!bg || bg === "bg-slate-900")
      return {
        background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)",
      };
    if (bg.startsWith("custom-gradient:"))
      return { background: bg.replace("custom-gradient:", "") };
    return {
      background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)",
    };
  };
  const [headerHeight, setHeaderHeight] = useState(64);
  const [footerHeight, setFooterHeight] = useState(40);
  const pageRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userId: urlUserId } = useParams<{ userId?: string }>();
  const {
    sortKey: userSortKey,
    sortDir: userSortDir,
    handleSort: handleUserSort,
    sortData: sortUsers,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting<User>();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewStartInEditMode, setViewStartInEditMode] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleteUserAlertOpen, setIsDeleteUserAlertOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionReasonError, setDeletionReasonError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentUserId] = useState("1");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Advanced filters
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<
    Array<{
      id: string;
      name: string;
      filters: typeof advancedFilters;
    }>
  >([]);
  const [filterName, setFilterName] = useState("");
  const [saveAsFilter, setSaveAsFilter] = useState(false);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [isEditingFilter, setIsEditingFilter] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isDuplicatingFilter, setIsDuplicatingFilter] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const [dismissedInactivityAlert, setDismissedInactivityAlert] =
    useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoPanelUser, setInfoPanelUser] = useState<any>(null);
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  // Alterar vínculo (Admin > Usuários) — vincular/desvincular/trocar a
  // empresa de um usuário via PUT /api/admin/users/:id/link. Só "empresas"
  // é suportado por enquanto (ver regra no backend).
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkTargetUser, setLinkTargetUser] = useState<any>(null);
  const [linkCompanyId, setLinkCompanyId] = useState<string>("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [companiesForSelect, setCompaniesForSelect] = useState<{ id: string; name: string }[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const openLinkPanel = (user: any) => {
    setLinkTargetUser(user);
    setLinkCompanyId(user.company_id || "");
    setLinkPanelOpen(true);
    if (companiesForSelect.length === 0) {
      setCompaniesLoading(true);
      apiClient
        .getCompanies({ limit: 500 })
        .then((res: any) => {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setCompaniesForSelect(list.map((c: any) => ({ id: c.id, name: c.name })));
        })
        .catch(() => setCompaniesForSelect([]))
        .finally(() => setCompaniesLoading(false));
    }
  };

  const closeLinkPanel = () => {
    if (linkSaving) return;
    setLinkPanelOpen(false);
  };

  const handleSaveLink = async () => {
    if (!linkTargetUser) return;
    setLinkSaving(true);
    try {
      const payload = linkCompanyId
        ? { link_type: "company", company_id: linkCompanyId }
        : { link_type: null, company_id: null };
      const updated = await apiClient.updateAdminUserCompanyLink(linkTargetUser.id, payload);
      toast({
        title: linkCompanyId ? "Vínculo atualizado" : "Usuário desvinculado",
        description: linkCompanyId
          ? `Usuário vinculado a ${updated.company_name || "empresa selecionada"}.`
          : "Usuário não está mais vinculado a nenhuma empresa.",
      });
      setLinkPanelOpen(false);
      if (infoPanelUser && infoPanelUser.id === linkTargetUser.id) {
        setInfoPanelUser(updated);
      }
      refetchUsers();
    } catch (e: any) {
      toast({
        title: "Não foi possível salvar o vínculo",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLinkSaving(false);
    }
  };
  const [advancedFilters, setAdvancedFilters] = useState({
    // Identificação
    name: "",
    email: "",
    cpf: "",
    phone: "",
    whatsapp: "",
    hasWhatsapp: "all",
    // Tipo e Função
    accountTypes: [] as string[],
    roles: [] as string[],
    // Refinamento client-side opcional (ex.: "pausado"). O filtro
    // Ativos/Inativos/Todos principal agora é o `statusFilter` (server-side,
    // via is_active na chamada da API) — ver useUsers acima.
    statuses: [] as string[],
    // Vínculo de perfil — "with" | "without" | "unknown"
    linkStatus: [] as string[],
    // Datas
    registrationDateFrom: "",
    registrationDateTo: "",
    lastAccessDateFrom: "",
    lastAccessDateTo: "",
    lastUpdateDateFrom: "",
    lastUpdateDateTo: "",
    // Métricas
    minScore: "",
    maxScore: "",
    userLevel: "all",
    rating: "all",
    // Dados Complementares
    hasCompany: "all",
    hasSpecialPermissions: "all",
    hasActiveWallet: "all",
    minBalance: "",
    maxBalance: "",
    hasFinancialActions: "all",
    profile: "all",
    plan: "all",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useItemsPerPage("admin-usuarios", 10);
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);

  useEffect(() => {
    // Map API users — bucket de inatividade calculado a partir do
    // last_login REAL (nunca mais dados de demonstração injetados aqui —
    // last_login agora é escrito de verdade em todo login, ver POST
    // /api/auth/login). auto_paused é "grudento": fica true tanto pelo
    // bucket ao vivo quanto por reactivation_review_required persistido,
    // pra não voltar a "Ativo" sozinho só porque o usuário logou de novo.
    const mapped = apiUsers.map((u: any) => {
      const bucket = computeInactivityBucket(u.last_login);
      return {
        ...u,
        is_active: u.is_active ?? true,
        online_status: "offline",
        account_type: u.account_type || "empresas",
        inactivity_bucket: bucket,
        auto_paused: bucket === "inactive_90" || u.reactivation_review_required === true,
      };
    });
    setUsers(mapped);
    setFilteredUsers(mapped);
    setCurrentPage(1);
  }, [apiUsers]);

  // Reabre a tela certa quando o usuário chega aqui clicando num pin de
  // sub-tela na Bandeja de Telas (Novo Usuário, ou o "Ver/Editar" de um
  // usuário específico).
  useConsumePendingActivation((key) => {
    if (key === "create") {
      setShowCreateUser(true);
    } else if (key.startsWith("view:") || key.startsWith("edit:")) {
      const [mode, id] = key.split(":");
      const found = users.find((u: any) => String(u.id) === id);
      if (found) {
        setSelectedUser(found);
        setViewStartInEditMode(mode === "edit");
        setIsViewDialogOpen(true);
      }
    }
  });

  // Deep-link: open user panel from URL param — o param é o número de
  // User_00001 (ex.: "1"), não o id técnico, então resolve contra a lista
  // já carregada em vez de chamar GET /users/:id com um valor que o
  // backend não reconhece.
  useEffect(() => {
    if (!urlUserId) return;
    if (usersLoading) return;
    const num = parseInt(urlUserId, 10);
    const found = Number.isFinite(num)
      ? users.find((u: any) => userCodeToNum(u.user_code) === num)
      : users.find((u: any) => u.id === urlUserId); // fallback pra links antigos com o id técnico
    if (found) {
      setSelectedUser(found);
      setIsViewDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId, usersLoading, users]);

  useEffect(() => {
    const filtered = users.filter((user) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const rawDigits = searchTerm.replace(/\D/g, "");

        // Word-prefix name match: each space-separated word tested against query start
        const nameWords = (user.name || "").toLowerCase().split(/\s+/);
        const nameMatch =
          nameWords.some((w) => w.startsWith(q)) ||
          (user.name || "").toLowerCase().includes(q);

        // Human-readable role label for text search
        const roleLabel = (() => {
          switch (user.role) {
            case "company_admin":
              return "company admin";
            case "company_user":
              return "company user";
            case "agency_admin":
              return "admin agência";
            case "agency_user":
              return "usuário agência";
            case "nomad":
              return "nômade nomade";
            case "admin":
              return "administrador admin";
            case "financial":
              return "financial financeiro";
            case "team_allka":
              return "team allka";
            case "partner":
              return "partner parceiro";
            default:
              return user.role || "";
          }
        })();
        const accountLabel = (() => {
          const t = (user.account_type || "").toLowerCase();
          if (t === "company" || t === "empresas" || t === "empresa")
            return "empresa company";
          if (t === "agency" || t === "agencias" || t === "agencia")
            return "agência agency";
          if (t === "nomad" || t === "nomades" || t === "nomade")
            return "nômade nomad";
          if (t === "admin") return "admin administrador";
          if (t === "parceiro" || t === "partner") return "parceiro partner";
          return t;
        })();
        const statusLabel = user.auto_paused
          ? "pausado"
          : user.is_active
            ? "ativo"
            : "bloqueado";
        const lgpdLabel = [
          user.has_lgpd_consent === false ? "lgpd pendente sem consentimento" : "",
          user.has_lgpd_consent === true ? "lgpd consentimento registrado" : "",
        ].join(" ");
        // Phone digit match — only when query has digits
        const phoneMatch =
          rawDigits.length > 0 &&
          (user.phone || "").replace(/\D/g, "").includes(rawDigits);

        const match =
          nameMatch ||
          (user.email || "").toLowerCase().includes(q) ||
          phoneMatch ||
          roleLabel.includes(q) ||
          accountLabel.includes(q) ||
          statusLabel.includes(q) ||
          lgpdLabel.includes(q);

        if (!match) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "active" && !user.is_active) return false;
        if (statusFilter === "inactive" && user.is_active) return false;
      }

      if (roleFilter !== "all") {
        if (roleFilter === "company_admin" && user.role !== "company_admin")
          return false;
        if (roleFilter === "company_user" && user.role !== "company_user")
          return false;
        if (roleFilter === "agency_admin" && user.role !== "agency_admin")
          return false;
        if (roleFilter === "agency_user" && user.role !== "agency_user")
          return false;
        if (roleFilter === "nomad" && user.role !== "nomad") return false;
        if (roleFilter === "admin" && user.role !== "admin") return false;
        if (roleFilter === "financial" && user.role !== "financial")
          return false;
        if (roleFilter === "team_allka" && user.role !== "team_allka")
          return false;
        if (roleFilter === "partner" && user.role !== "partner") return false;
      }

      // Advanced filters — identificação
      if (advancedFilters.name.trim()) {
        if (
          !(user.name || "")
            .toLowerCase()
            .includes(advancedFilters.name.trim().toLowerCase())
        )
          return false;
      }
      if (advancedFilters.email.trim()) {
        if (
          !(user.email || "")
            .toLowerCase()
            .includes(advancedFilters.email.trim().toLowerCase())
        )
          return false;
      }
      if (advancedFilters.phone.trim()) {
        const digits = advancedFilters.phone.replace(/\D/g, "");
        if (digits && !(user.phone || "").replace(/\D/g, "").includes(digits))
          return false;
      }

      // Advanced filters — tipo de conta
      if (advancedFilters.accountTypes.length > 0) {
        const at = (user.account_type || "").toLowerCase();
        const match = advancedFilters.accountTypes.some((type) => {
          if (type === "admin") return at === "admin";
          if (type === "company")
            return at === "empresas" || at === "empresa" || at === "company";
          if (type === "nomad")
            return at === "nomades" || at === "nomade" || at === "nomad";
          if (type === "agency")
            return at === "agencias" || at === "agencia" || at === "agency";
          if (type === "partner")
            return at === "parceiro" || at === "partner";
          if (type === "lider")
            return at === "lider" || at === "leader";
          return false;
        });
        if (!match) return false;
      }

      // Advanced filters — vínculo (com/sem)
      if (advancedFilters.linkStatus && advancedFilters.linkStatus.length > 0) {
        const linked = getLinkedAccount(user);
        const state = linked === "unknown" ? "unknown" : linked ? "with" : "without";
        if (!advancedFilters.linkStatus.includes(state)) return false;
      }

      // Advanced filters — função
      if (advancedFilters.roles.length > 0) {
        const r = (user.role || "").toLowerCase();
        const isAdmin =
          r.includes("admin") ||
          r === "admin" ||
          r === "team_allka" ||
          r === "financial";
        const match = advancedFilters.roles.some((role) => {
          if (role === "admin") return isAdmin;
          if (role === "user") return !isAdmin;
          return false;
        });
        if (!match) return false;
      }

      // Advanced filters — status
      if (advancedFilters.statuses.length > 0) {
        const match = advancedFilters.statuses.some((status) => {
          if (status === "active")
            return user.is_active === true && !user.auto_paused;
          if (status === "blocked") return user.is_active === false;
          if (status === "pausado") return user.auto_paused === true;
          return false;
        });
        if (!match) return false;
      }

      // Advanced filters — datas
      if (advancedFilters.registrationDateFrom) {
        const userDate = new Date(user.created_at);
        const filterDate = new Date(advancedFilters.registrationDateFrom);
        if (userDate < filterDate) return false;
      }

      if (advancedFilters.registrationDateTo) {
        const userDate = new Date(user.created_at);
        const filterDate = new Date(advancedFilters.registrationDateTo);
        filterDate.setHours(23, 59, 59, 999);
        if (userDate > filterDate) return false;
      }

      if (advancedFilters.lastAccessDateFrom && user.last_login) {
        const userDate = new Date(user.last_login);
        const filterDate = new Date(advancedFilters.lastAccessDateFrom);
        if (userDate < filterDate) return false;
      }

      if (advancedFilters.lastAccessDateTo && user.last_login) {
        const userDate = new Date(user.last_login);
        const filterDate = new Date(advancedFilters.lastAccessDateTo);
        filterDate.setHours(23, 59, 59, 999);
        if (userDate > filterDate) return false;
      }

      if (advancedFilters.plan !== "all") {
        // Mock plan filter - in real app would check user.plan field
        const userPlan =
          user.account_type === "company" || user.account_type === "empresas"
            ? "premium"
            : "free";
        if (userPlan !== advancedFilters.plan) return false;
      }

      return true;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchTerm, statusFilter, roleFilter, advancedFilters]);

  // Pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPaginatedUsers(sortUsers(filteredUsers).slice(startIndex, endIndex));
  }, [filteredUsers, currentPage, pageSize, userSortKey, userSortDir]);

  // Measure header/footer heights for modal positioning
  useEffect(() => {
    const measure = () => {
      const h = document.querySelector("header");
      const f = document.querySelector("footer");
      if (h) setHeaderHeight(h.offsetHeight);
      if (f) setFooterHeight(f.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const searchSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 6);
  }, [users, searchTerm]);

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (key === "usuario") return next; // required column, always visible
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openInfoPanel = (user: User) => {
    setInfoPanelUser(user);
    setInfoPanelOpen(true);
  };

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const [pageJumpValue, setPageJumpValue] = useState("");
  const commitPageJump = () => {
    const n = parseInt(pageJumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n);
    setPageJumpValue("");
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
        if (totalPages > maxVisible) pages.push("...");
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push("...");
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push("...");
        for (
          let i = currentPage - halfVisible;
          i <= currentPage + halfVisible;
          i++
        ) {
          pages.push(i);
        }
        pages.push("...");
      }
    }
    return pages;
  };

  const PaginationControls = () => (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        title="Página anterior"
        className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {getPageNumbers().map((page, index) =>
        page === "..." ? (
          <span key={index} className="text-xs text-slate-300 px-0.5">
            ·
          </span>
        ) : (
          <button
            key={index}
            onClick={() => setCurrentPage(Number(page))}
            title={page === currentPage ? "Página atual" : `Ir para a página ${page}`}
            className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
              page === currentPage
                ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            }`}
            style={page === currentPage ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {page}
          </button>
        ),
      )}
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        title="Próxima página"
        className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitPageJump(); }}
                placeholder="Pág."
                aria-label="Ir para a página"
                className="h-7 w-14 text-xs text-center rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={commitPageJump}
                disabled={!pageJumpValue}
                className="group relative h-7 px-2.5 rounded-[8px] text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                />
                <span className="relative z-10 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors">Ir</span>
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">Ir diretamente para uma página</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const CountText = ({ side = "bottom" as "top" | "bottom" }) => (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-slate-400 whitespace-nowrap cursor-default">
            {(() => {
              const start = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
              const end = Math.min(currentPage * pageSize, filteredUsers.length);
              return (
                <>
                  {start}-{end} de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{filteredUsers.length}</span>{" "}
                  usuário{filteredUsers.length !== 1 ? "s" : ""}
                  {filteredUsers.length !== users.length && <> (de {users.length} no total)</>}
                </>
              );
            })()}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          Intervalo de usuários exibido nesta página, do total encontrado
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRoleFilter("all");
    setAdvancedFilters({
      name: "",
      email: "",
      cpf: "",
      phone: "",
      whatsapp: "",
      hasWhatsapp: "all",
      accountTypes: [],
      roles: [],
      statuses: [],
      registrationDateFrom: "",
      registrationDateTo: "",
      lastAccessDateFrom: "",
      lastAccessDateTo: "",
      lastUpdateDateFrom: "",
      lastUpdateDateTo: "",
      minScore: "",
      maxScore: "",
      userLevel: "all",
      rating: "all",
      hasCompany: "all",
      hasSpecialPermissions: "all",
      hasActiveWallet: "all",
      minBalance: "",
      maxBalance: "",
      hasFinancialActions: "all",
      profile: "all",
      plan: "all",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    roleFilter !== "all" ||
    advancedFilters.registrationDateFrom ||
    advancedFilters.registrationDateTo ||
    advancedFilters.lastAccessDateFrom ||
    advancedFilters.lastAccessDateTo ||
    advancedFilters.plan !== "all";

  const handleUserAction = (user: User, action: string) => {
    setSelectedUser(user);

    switch (action) {
      case "view":
        setViewStartInEditMode(false);
        setIsViewDialogOpen(true);
        navigate(`/admin/usuarios/${userCodeToNum((user as any).user_code) ?? user.id}`, { replace: true });
        break;
      case "edit":
        setViewStartInEditMode(true);
        setIsViewDialogOpen(true);
        navigate(`/admin/usuarios/${userCodeToNum((user as any).user_code) ?? user.id}`, { replace: true });
        break;
      case "block":
        setIsDeleteAlertOpen(true);
        break;
      case "delete":
        setDeletionReason("");
        setDeletionReasonError("");
        setIsDeleteUserAlertOpen(true);
        break;
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Validate deletion reason
    if (!deletionReason.trim()) {
      setDeletionReasonError("O motivo da exclusão é obrigatório");
      return;
    }

    if (deletionReason.trim().length < 10) {
      setDeletionReasonError("O motivo deve ter no mínimo 10 caracteres");
      return;
    }

    // Security check: prevent deletion of current user
    if (selectedUser.id === currentUserId) {
      console.error("Cannot delete current logged-in user");
      return;
    }

    // Security check: prevent deletion of main admin accounts
    if (selectedUser.is_admin && selectedUser.role === "admin") {
      console.error("Cannot delete main admin account");
      return;
    }

    setIsDeleteLoading(true);
    try {
      // Real API call to delete user
      await apiDeleteUser(String(selectedUser.id));

      toast({
        title: "Usuário excluído",
        description: `O usuário "${selectedUser.name}" foi excluído com sucesso.`,
      });
      window.dispatchEvent(new Event("allka:admin-counts-changed"));

      // Close dialog and reset
      setIsDeleteUserAlertOpen(false);
      setSelectedUser(null);
      setDeletionReason("");
      setDeletionReasonError("");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao excluir",
        description:
          error.message || "Erro ao excluir usuário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handlePhoneCall = (phone: string) => {
    // Remove formatting and open phone dialer
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`tel:${cleanPhone}`, "_self");
  };

  const handleWhatsApp = (phone: string) => {
    // Remove formatting and open WhatsApp
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "empresas":
        return "Company";
      case "agencias":
        return "Agency";
      case "nomades":
        return "Nomad";
      case "admin":
        return "Admin";
      default:
        return type;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "empresas":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "agencias":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "nomades":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "Company Admin";
      case "company_user":
        return "Company User";
      case "agency_admin":
        return "Agency Admin";
      case "agency_user":
        return "Agency User";
      case "nomad_admin":
        return "Nomad Admin";
      case "nomad":
        return "Nomad Admin";
      case "admin":
        return "Administrador";
      case "financial":
        return "Financial";
      case "team_allka":
        return "Team allka";
      case "partner":
        return "Partner";
      default:
        return role;
    }
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

  const handleStatusConfirmation = async (
    reason: string,
    duration: "indefinite" | Date,
  ) => {
    if (!selectedUser) return;

    try {
      const newStatus = !selectedUser.is_active;
      await updateUser(String(selectedUser.id), { is_active: newStatus });
      // Sync into PlatformUsersContext so company tabs reflect the change immediately
      updatePlatformUser(String(selectedUser.id), { is_active: newStatus });

      setSelectedUser({ ...selectedUser, is_active: newStatus });
      toast({
        title: newStatus ? "Usuário desbloqueado" : "Usuário bloqueado",
        description: `O usuário "${selectedUser.name}" foi ${newStatus ? "desbloqueado" : "bloqueado"} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status do usuário.",
        variant: "destructive",
      });
    }

    // Close dialog
    setIsDeleteAlertOpen(false);
  };

  const getAccountTypeBadge = (accountType: string, role?: string) => {
    // Normalizar tipo de conta
    const normalizedType = String(accountType).toLowerCase();

    if (normalizedType === "admin")
      return { label: "Admin", badgeColor: "indigo" as const };
    if (normalizedType === "company" || normalizedType === "empresas")
      return { label: "Company", badgeColor: "purple" as const };
    if (normalizedType === "agency" || normalizedType === "agencias")
      return { label: "Agency", badgeColor: "orange" as const };
    if (normalizedType === "nomad" || normalizedType === "nomades")
      return { label: "Nomad", badgeColor: "blue" as const };
    if (normalizedType === "parceiro" || normalizedType === "partner")
      return { label: "Partner", badgeColor: "pink" as const };
    if (normalizedType === "lider" || normalizedType === "leader" || role === "lider")
      return { label: "Leader", badgeColor: "amber" as const };
    if (role === "financial")
      return { label: "Financial", badgeColor: "orange" as const };
    if (role === "team_allka")
      return { label: "Team allka", badgeColor: "indigo" as const };
    return { label: "Outro", badgeColor: "gray" as const };
  };

  // ── Sparkline ─────────────────────────────────────────────────────────────
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const w = 56,
      h = 16;
    const min = Math.min(...data),
      max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - 4 - ((v - min) / range) * (h - 12),
    }));
    const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPath = `M0,${h} ${pts.map((p) => `L${p.x},${p.y}`).join(" ")} L${w},${h} Z`;
    const gradId = `ufill-${color.replace("#", "")}`;
    return (
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyPts}
        />
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="2.5"
          fill={color}
        />
      </svg>
    );
  };

  const statColorMap: Record<
    string,
    { gradient: string; borderClass: string; strokeColor: string }
  > = {
    blue: {
      gradient: "from-blue-500 to-blue-700",
      borderClass: "border-2 border-blue-300/70",
      strokeColor: "white",
    },
    emerald: {
      gradient: "from-emerald-500 to-teal-600",
      borderClass: "border-2 border-emerald-300/70",
      strokeColor: "white",
    },
    violet: {
      gradient: "from-violet-500 to-purple-700",
      borderClass: "border-2 border-violet-300/70",
      strokeColor: "white",
    },
    orange: {
      gradient: "from-orange-500 to-rose-600",
      borderClass: "border-2 border-orange-300/70",
      strokeColor: "white",
    },
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.role === "admin" || u.account_type === "admin").length;
  const active90 = users.filter((u) => {
    const last = new Date(u.last_login || Date.now());
    const ago = new Date();
    ago.setDate(ago.getDate() - 90);
    return last >= ago;
  }).length;

  const statsHistory = {
    total: {
      data: [8, 10, 11, 13, 14, 14, 15, 16, 16, 17, 17, totalUsers],
      prev: 17,
      label: "mês passado",
    },
    active: {
      data: [6, 8, 9, 10, 11, 12, 12, 13, 14, 14, 15, activeUsers],
      prev: 15,
      label: "mês passado",
    },
    admins: {
      data: [1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, adminUsers],
      prev: 3,
      label: "mês passado",
    },
    active90: {
      data: [7, 9, 10, 11, 12, 13, 13, 14, 15, 15, 16, active90],
      prev: 16,
      label: "mês passado",
    },
  };

  const StatCard = ({
    label,
    value,
    prevValue,
    prevLabel,
    pct,
    up,
    sparkKey,
    icon: Icon,
    colorKey,
  }: {
    label: string;
    value: number;
    prevValue: number;
    prevLabel: string;
    pct: number;
    up: boolean;
    sparkKey: keyof typeof statsHistory;
    icon: any;
    colorKey: keyof typeof statColorMap;
  }) => {
    const colors = statColorMap[colorKey];
    const [hov, setHov] = useState(false);
    return (
      <div
        className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.borderClass} ${hov ? "shadow-xl scale-[1.02]" : "shadow-lg"}`}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Tooltip */}
        <div
          className={`absolute top-2 right-2 z-10 transition-opacity duration-150 ${hov ? "opacity-100" : "opacity-0"}`}
        >
          <TooltipProvider>
            <Tooltip open={hov}>
              <TooltipTrigger asChild>
                <div className="bg-white/20 hover:bg-white/30 rounded-md p-0.5 cursor-pointer transition-colors">
                  <Info className="h-2.5 w-2.5 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-slate-100 border-slate-200 text-slate-900 p-3 rounded-xl shadow-xl"
              >
                <div className="min-w-[130px]">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {label}
                  </p>
                  <div className="flex items-center justify-between gap-4 mb-1.5">
                    <span className="text-xs text-slate-500">Atual</span>
                    <span className="text-sm font-bold text-slate-900">
                      {value}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs text-slate-500">{prevLabel}</span>
                    <span className="text-sm font-semibold text-slate-600">
                      {prevValue}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg ${up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span className="text-xs font-semibold">
                      {up ? "+" : "-"}
                      {pct}% vs {prevLabel}
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="px-2.5 pt-1.5 pb-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider leading-tight truncate">
              {label}
            </p>
            <div className="bg-white/20 rounded-md p-0.5 flex-shrink-0 ml-1">
              <Icon className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold leading-none text-white">
                {value}
              </p>
              <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md bg-white/20">
                {up ? (
                  <TrendingUp className="h-2.5 w-2.5 text-white" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 text-white" />
                )}
                <span className="text-[9px] font-semibold text-white">
                  {up ? "+" : "-"}
                  {pct}%
                </span>
                <span className="text-[9px] text-white/60">vs. anterior</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Sparkline
                data={statsHistory[sparkKey].data}
                color={colors.strokeColor}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (usersLoading) {
    return <PageLoader text="Carregando usuários…" />;
  }

  if (usersError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar usuários
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {usersError}
          </p>
        </div>
        <Button onClick={refetchUsers} className="btn-brand">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden" ref={pageRef}>
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Users}
        title="Usuários"
        description="Gerencie todos os usuários da plataforma"
        actions={<>
          <div className="bg-white rounded-lg">
            <ExportButton pageRef={pageRef} filename="usuarios" />
          </div>
          <PinToTrayButton id="page-usuarios" label="Usuários" icon={Users} path="/admin/usuarios" />
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Novo Usuário
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo usuário</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total de Usuários"
          value={totalUsers}
          prevValue={statsHistory.total.prev}
          prevLabel={statsHistory.total.label}
          pct={Math.round(
            Math.abs(
              ((totalUsers - statsHistory.total.prev) /
                (statsHistory.total.prev || 1)) *
                100,
            ),
          )}
          up={totalUsers >= statsHistory.total.prev}
          sparkKey="total"
          icon={Users}
          colorKey="blue"
        />
        <StatCard
          label="Usuários Ativos"
          value={activeUsers}
          prevValue={statsHistory.active.prev}
          prevLabel={statsHistory.active.label}
          pct={Math.round(
            Math.abs(
              ((activeUsers - statsHistory.active.prev) /
                (statsHistory.active.prev || 1)) *
                100,
            ),
          )}
          up={activeUsers >= statsHistory.active.prev}
          sparkKey="active"
          icon={Activity}
          colorKey="emerald"
        />
        <StatCard
          label="Administradores"
          value={adminUsers}
          prevValue={statsHistory.admins.prev}
          prevLabel={statsHistory.admins.label}
          pct={Math.round(
            Math.abs(
              ((adminUsers - statsHistory.admins.prev) /
                (statsHistory.admins.prev || 1)) *
                100,
            ),
          )}
          up={adminUsers >= statsHistory.admins.prev}
          sparkKey="admins"
          icon={Shield}
          colorKey="violet"
        />
        <StatCard
          label="Ativos 90 dias"
          value={active90}
          prevValue={statsHistory.active90.prev}
          prevLabel={statsHistory.active90.label}
          pct={Math.round(
            Math.abs(
              ((active90 - statsHistory.active90.prev) /
                (statsHistory.active90.prev || 1)) *
                100,
            ),
          )}
          up={active90 >= statsHistory.active90.prev}
          sparkKey="active90"
          icon={Clock}
          colorKey="orange"
        />
      </div>

      {/* Main Table Card */}
      <div className={STANDARD_SHELL_TABLE_CARD_CLASS}>
        {/* Row 1 — search + icon toolbar buttons */}
        <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
          <div ref={searchBoxRef} className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, e-mail ou telefone..."
              value={searchTerm}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm w-full"
            />
            {searchFocused && searchTerm && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-y-auto">
                {searchSuggestions.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">Nenhum resultado</p>
                ) : (
                  searchSuggestions.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSearchTerm(u.name);
                        setSearchFocused(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="text-[10px] font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700">
                          {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[
                { value: "active", label: "Ativos" },
                { value: "inactive", label: "Inativos" },
                { value: "all", label: "Todos" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === value
                      ? "text-white"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  style={statusFilter === value ? { background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
            <IconToolbarButton icon={Filter} tooltip="Filtros" onClick={() => setIsFilterModalOpen(true)} />
            <IconToolbarButton icon={Settings2} tooltip="Configurar colunas" onClick={() => setColConfigOpen(true)} />
          </div>
        </div>

        {/* Row 2 — items-per-page + count + scrollbar mirror + numbered pagination (mirrors admin/empresas) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              variant="top"
            />
            <CountText side="bottom" />
          </div>

          {/* Top horizontal scrollbar mirror — only rendered when the table
              actually overflows its container. */}
          {hasHorizontalOverflow && (
            <div
              ref={topScrollRef}
              onScroll={handleTopBarScroll}
              title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
              className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
              style={{ height: 12 }}
            >
              <div style={{ minWidth: 960, height: 1 }} />
            </div>
          )}

          {totalPages > 1 && <PaginationControls />}
        </div>

        <div>
            {/* Filter Modal — empresas layout */}
            {isFilterModalOpen &&
              (() => {
                const closeFn = () => {
                  setIsFilterModalOpen(false);
                  setSelectedFilterId(null);
                  setIsEditingFilter(false);
                  setUnsavedChanges(false);
                  setShowSaveInput(false);
                  setFilterNameInput("");
                };
                const handleDrop = (targetId: string) => {
                  if (!draggingFilterId || draggingFilterId === targetId)
                    return;
                  const from = savedFilters.findIndex(
                    (f) => f.id === draggingFilterId,
                  );
                  const to = savedFilters.findIndex((f) => f.id === targetId);
                  if (from === -1 || to === -1) return;
                  const reordered = [...savedFilters];
                  const [moved] = reordered.splice(from, 1);
                  reordered.splice(to, 0, moved);
                  setSavedFilters(reordered);
                  setDraggingFilterId(null);
                  setDragOverFilterId(null);
                };
                const guardedClose = () => {
                  if (unsavedChanges) {
                    setPendingClose(() => closeFn);
                    return;
                  }
                  closeFn();
                };
                return (
                  <StandardModalDialog
                    open={isFilterModalOpen}
                    onClose={guardedClose}
                    title="Filtros Avançados"
                    subtitle={
                      unsavedChanges
                        ? "• Alterações não salvas"
                        : selectedFilterId && !isEditingFilter
                          ? "Filtro carregado"
                          : "Configure e aplique filtros"
                    }
                    footer={
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => {
                            setAdvancedFilters({
                              name: "",
                              email: "",
                              cpf: "",
                              phone: "",
                              whatsapp: "",
                              hasWhatsapp: "all",
                              accountTypes: [],
                              roles: [],
                              statuses: [],
                              registrationDateFrom: "",
                              registrationDateTo: "",
                              lastAccessDateFrom: "",
                              lastAccessDateTo: "",
                              lastUpdateDateFrom: "",
                              lastUpdateDateTo: "",
                              minScore: "",
                              maxScore: "",
                              userLevel: "all",
                              rating: "all",
                              hasCompany: "all",
                              hasSpecialPermissions: "all",
                              hasActiveWallet: "all",
                              minBalance: "",
                              maxBalance: "",
                              hasFinancialActions: "all",
                              profile: "all",
                              plan: "all",
                            });
                            setUnsavedChanges(false);
                          }}
                          className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Limpar filtros
                        </button>
                        <div className="flex items-center gap-2">
                          {showSaveInput ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                autoFocus
                                type="text"
                                value={filterNameInput}
                                onChange={(e) =>
                                  setFilterNameInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    filterNameInput.trim()
                                  ) {
                                    const newId = `filter-${Date.now()}`;
                                    setSavedFilters([
                                      ...savedFilters,
                                      {
                                        id: newId,
                                        name: filterNameInput.trim(),
                                        filters: { ...advancedFilters },
                                      },
                                    ]);
                                    setSelectedFilterId(newId);
                                    setUnsavedChanges(false);
                                    setShowSaveInput(false);
                                    setFilterNameInput("");
                                  }
                                  if (e.key === "Escape") {
                                    setShowSaveInput(false);
                                    setFilterNameInput("");
                                  }
                                }}
                                placeholder={`Filtro ${savedFilters.length + 1}`}
                                className="h-7 px-2 rounded-md text-[11px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                              />
                              <button
                                disabled={!filterNameInput.trim()}
                                onClick={() => {
                                  const newId = `filter-${Date.now()}`;
                                  setSavedFilters([
                                    ...savedFilters,
                                    {
                                      id: newId,
                                      name: filterNameInput.trim(),
                                      filters: { ...advancedFilters },
                                    },
                                  ]);
                                  setSelectedFilterId(newId);
                                  setUnsavedChanges(false);
                                  setShowSaveInput(false);
                                  setFilterNameInput("");
                                }}
                                className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => {
                                  setShowSaveInput(false);
                                  setFilterNameInput("");
                                }}
                                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : selectedFilterId && unsavedChanges ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSavedFilters(
                                    savedFilters.map((f) =>
                                      f.id === selectedFilterId
                                        ? {
                                            ...f,
                                            filters: { ...advancedFilters },
                                          }
                                        : f,
                                    ),
                                  );
                                  setUnsavedChanges(false);
                                }}
                                className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all shadow-sm"
                              >
                                Atualizar filtro
                              </button>
                              <button
                                onClick={() => {
                                  setFilterNameInput(
                                    `Filtro ${savedFilters.length + 1}`,
                                  );
                                  setShowSaveInput(true);
                                }}
                                className="h-7 px-3 rounded-md text-[11px] font-medium border border-emerald-400 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                Salvar como novo
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setFilterNameInput(
                                  `Filtro ${savedFilters.length + 1}`,
                                );
                                setShowSaveInput(true);
                              }}
                              className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                            >
                              Salvar filtro
                            </button>
                          )}
                          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                          <button
                            onClick={closeFn}
                            className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              setIsFilterModalOpen(false);
                              setShowSaveInput(false);
                            }}
                            className="h-7 px-4 rounded-md text-[11px] font-semibold btn-brand transition-all shadow-sm"
                          >
                            Aplicar Filtros
                          </button>
                        </div>
                      </div>
                    }
                  >
                      {/* Body */}
                      <div className="flex flex-1 overflow-hidden min-h-0">
                        {/* Left — Saved Filters (compact, drag-drop, inline rename) */}
                        <div className="w-44 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1 flex-shrink-0">
                            <Filter className="h-3 w-3" /> Filtros Salvos
                          </p>
                          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                            {savedFilters.length === 0 ? (
                              <div className="text-center py-8">
                                <Filter className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  Nenhum filtro salvo
                                </p>
                              </div>
                            ) : (
                              savedFilters.map((filter) => (
                                <div
                                  key={filter.id}
                                  draggable
                                  onDragStart={() =>
                                    setDraggingFilterId(filter.id)
                                  }
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOverFilterId(filter.id);
                                  }}
                                  onDrop={() => handleDrop(filter.id)}
                                  onDragEnd={() => {
                                    setDraggingFilterId(null);
                                    setDragOverFilterId(null);
                                  }}
                                  onClick={() => {
                                    if (editingFilterId) return;
                                    setAdvancedFilters(filter.filters);
                                    setSelectedFilterId(filter.id);
                                    setIsEditingFilter(false);
                                    setUnsavedChanges(false);
                                  }}
                                  className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                                    dragOverFilterId === filter.id &&
                                    draggingFilterId !== filter.id
                                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                                      : draggingFilterId === filter.id
                                        ? "opacity-40"
                                        : selectedFilterId === filter.id
                                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                                          : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                                  }`}
                                >
                                  <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                                  {editingFilterId === filter.id ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingFilterName}
                                      onChange={(e) =>
                                        setEditingFilterName(e.target.value)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (
                                          e.key === "Enter" &&
                                          editingFilterName.trim()
                                        ) {
                                          setSavedFilters(
                                            savedFilters.map((f) =>
                                              f.id === filter.id
                                                ? {
                                                    ...f,
                                                    name: editingFilterName.trim(),
                                                  }
                                                : f,
                                            ),
                                          );
                                          setEditingFilterId(null);
                                        } else if (e.key === "Escape")
                                          setEditingFilterId(null);
                                      }}
                                      onBlur={() => {
                                        if (editingFilterName.trim())
                                          setSavedFilters(
                                            savedFilters.map((f) =>
                                              f.id === filter.id
                                                ? {
                                                    ...f,
                                                    name: editingFilterName.trim(),
                                                  }
                                                : f,
                                            ),
                                          );
                                        setEditingFilterId(null);
                                      }}
                                      className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200"
                                    />
                                  ) : (
                                    <span className="flex-1 truncate">
                                      {filter.name}
                                    </span>
                                  )}
                                  {editingFilterId !== filter.id && (
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingFilterId(filter.id);
                                          setEditingFilterName(filter.name);
                                        }}
                                        title="Renomear"
                                        className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400 transition-all"
                                      >
                                        <Pencil className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSavedFilters(
                                            savedFilters.filter(
                                              (f) => f.id !== filter.id,
                                            ),
                                          );
                                          if (selectedFilterId === filter.id)
                                            setSelectedFilterId(null);
                                        }}
                                        title="Excluir"
                                        className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400 transition-all"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Right — Filter config */}
                        <div className="flex-1 overflow-y-auto p-4">
                          <Accordion
                            type="multiple"
                            defaultValue={["identificacao", "tipo-funcao"]}
                            className="space-y-3"
                          >
                            {/* SEÇÃO: IDENTIFICAÇÃO */}
                            <AccordionItem
                              value="identificacao"
                              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                            >
                              <AccordionTrigger className="bg-white hover:bg-slate-50 dark:bg-[oklch(0.17_0.016_258)] dark:hover:bg-[oklch(0.20_0.018_258)] px-4 py-3 transition-colors">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Identificação
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                                <div className="grid grid-cols-2 gap-3">
                                  <Input
                                    placeholder="Nome"
                                    value={advancedFilters.name}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        name: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="E-mail"
                                    value={advancedFilters.email}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        email: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="CPF"
                                    value={advancedFilters.cpf}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        cpf: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="Telefone"
                                    value={advancedFilters.phone}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        phone: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3 items-end">
                                  <Input
                                    placeholder="WhatsApp"
                                    value={advancedFilters.whatsapp}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        whatsapp: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  <Select
                                    value={advancedFilters.hasWhatsapp}
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        hasWhatsapp: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Com WhatsApp?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="yes">Sim</SelectItem>
                                      <SelectItem value="no">Não</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* SEÇÃO: TIPO E FUNÇÃO */}
                            <AccordionItem
                              value="tipo-funcao"
                              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                            >
                              <AccordionTrigger className="bg-white hover:bg-slate-50 dark:bg-[oklch(0.17_0.016_258)] dark:hover:bg-[oklch(0.20_0.018_258)] px-4 py-3 transition-colors">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Tipo e Função
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Tipo de Conta
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {["admin", "company", "agency", "partner", "lider", "nomad"].map(
                                      (type) => (
                                        <label
                                          key={type}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={advancedFilters.accountTypes.includes(
                                              type,
                                            )}
                                            onChange={(e) => {
                                              setAdvancedFilters({
                                                ...advancedFilters,
                                                accountTypes: e.target.checked
                                                  ? [
                                                      ...advancedFilters.accountTypes,
                                                      type,
                                                    ]
                                                  : advancedFilters.accountTypes.filter(
                                                      (t) => t !== type,
                                                    ),
                                              });
                                              if (selectedFilterId)
                                                setUnsavedChanges(true);
                                            }}
                                            className="rounded border-slate-300 dark:border-slate-600"
                                          />
                                          <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                                            {type}
                                          </span>
                                        </label>
                                      ),
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Função
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {["admin", "user"].map((role) => (
                                      <label
                                        key={role}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={advancedFilters.roles.includes(
                                            role,
                                          )}
                                          onChange={(e) => {
                                            setAdvancedFilters({
                                              ...advancedFilters,
                                              roles: e.target.checked
                                                ? [
                                                    ...advancedFilters.roles,
                                                    role,
                                                  ]
                                                : advancedFilters.roles.filter(
                                                    (r) => r !== role,
                                                  ),
                                            });
                                            if (selectedFilterId)
                                              setUnsavedChanges(true);
                                          }}
                                          className="rounded border-slate-300 dark:border-slate-600"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                                          {role}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Vínculo
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { value: "with", label: "Com vínculo" },
                                      { value: "without", label: "Sem vínculo" },
                                    ].map(({ value, label }) => (
                                      <label
                                        key={value}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={advancedFilters.linkStatus.includes(value)}
                                          onChange={(e) => {
                                            setAdvancedFilters({
                                              ...advancedFilters,
                                              linkStatus: e.target.checked
                                                ? [...advancedFilters.linkStatus, value]
                                                : advancedFilters.linkStatus.filter((v) => v !== value),
                                            });
                                            if (selectedFilterId) setUnsavedChanges(true);
                                          }}
                                          className="rounded border-slate-300 dark:border-slate-600"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">
                                          {label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Status
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {["active", "blocked", "pausado"].map(
                                      (status) => (
                                        <label
                                          key={status}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={advancedFilters.statuses.includes(
                                              status,
                                            )}
                                            onChange={(e) => {
                                              setAdvancedFilters({
                                                ...advancedFilters,
                                                statuses: e.target.checked
                                                  ? [
                                                      ...advancedFilters.statuses,
                                                      status,
                                                    ]
                                                  : advancedFilters.statuses.filter(
                                                      (s) => s !== status,
                                                    ),
                                              });
                                              if (selectedFilterId)
                                                setUnsavedChanges(true);
                                            }}
                                            className="rounded border-slate-300 dark:border-slate-600"
                                          />
                                          <span className="text-sm text-slate-700 dark:text-slate-300">
                                            {status === "active"
                                              ? "Ativo"
                                              : status === "blocked"
                                                ? "Bloqueado"
                                                : "Pausado"}
                                          </span>
                                        </label>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* SEÇÃO: DATAS */}
                            <AccordionItem
                              value="datas"
                              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                            >
                              <AccordionTrigger className="bg-white hover:bg-slate-50 dark:bg-[oklch(0.17_0.016_258)] dark:hover:bg-[oklch(0.20_0.018_258)] px-4 py-3 transition-colors">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Período de Datas
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Data de Cadastro
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="date"
                                      value={
                                        advancedFilters.registrationDateFrom
                                      }
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          registrationDateFrom: e.target.value,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className="h-8 text-sm flex-1"
                                    />
                                    <Input
                                      type="date"
                                      value={advancedFilters.registrationDateTo}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          registrationDateTo: e.target.value,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className="h-8 text-sm flex-1"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Último Acesso
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="date"
                                      value={advancedFilters.lastAccessDateFrom}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          lastAccessDateFrom: e.target.value,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className="h-8 text-sm flex-1"
                                    />
                                    <Input
                                      type="date"
                                      value={advancedFilters.lastAccessDateTo}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          lastAccessDateTo: e.target.value,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className="h-8 text-sm flex-1"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                                    Última Atualização
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="date"
                                      value={advancedFilters.lastUpdateDateFrom}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          lastUpdateDateFrom: e.target.value,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className="h-8 text-sm flex-1"
                                    />
                                    <Input
                                      type="date"
                                      value={advancedFilters.lastUpdateDateTo}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          lastUpdateDateTo: e.target.value,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className="h-8 text-sm flex-1"
                                    />
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* SEÇÃO: MÉTRICAS */}
                            <AccordionItem
                              value="metricas"
                              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                            >
                              <AccordionTrigger className="bg-white hover:bg-slate-50 dark:bg-[oklch(0.17_0.016_258)] dark:hover:bg-[oklch(0.20_0.018_258)] px-4 py-3 transition-colors">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Métricas e Pontuação
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                                <div className="grid grid-cols-2 gap-3">
                                  <Input
                                    placeholder="Pontuação Mínima"
                                    type="number"
                                    value={advancedFilters.minScore}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        minScore: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="Pontuação Máxima"
                                    type="number"
                                    value={advancedFilters.maxScore}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        maxScore: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <Select
                                    value={advancedFilters.userLevel}
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        userLevel: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Nível" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="iniciante">
                                        Iniciante
                                      </SelectItem>
                                      <SelectItem value="intermediario">
                                        Intermediário
                                      </SelectItem>
                                      <SelectItem value="avancado">
                                        Avançado
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={advancedFilters.rating}
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        rating: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Avaliação" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todas</SelectItem>
                                      <SelectItem value="5">
                                        5 Estrelas
                                      </SelectItem>
                                      <SelectItem value="4">
                                        4+ Estrelas
                                      </SelectItem>
                                      <SelectItem value="3">
                                        3+ Estrelas
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* SEÇÃO: DADOS COMPLEMENTARES */}
                            <AccordionItem
                              value="complementares"
                              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                            >
                              <AccordionTrigger className="bg-white hover:bg-slate-50 dark:bg-[oklch(0.17_0.016_258)] dark:hover:bg-[oklch(0.20_0.018_258)] px-4 py-3 transition-colors">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  Dados Complementares
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                                <div className="grid grid-cols-2 gap-3">
                                  <Select
                                    value={advancedFilters.hasCompany}
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        hasCompany: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Empresa?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="yes">Sim</SelectItem>
                                      <SelectItem value="no">Não</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={
                                      advancedFilters.hasSpecialPermissions
                                    }
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        hasSpecialPermissions: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Perms especiais?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="yes">Sim</SelectItem>
                                      <SelectItem value="no">Não</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <Select
                                    value={advancedFilters.hasActiveWallet}
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        hasActiveWallet: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Carteira?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="yes">Sim</SelectItem>
                                      <SelectItem value="no">Não</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={advancedFilters.hasFinancialActions}
                                    onValueChange={(value) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        hasFinancialActions: value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Ações financeiras?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="yes">Sim</SelectItem>
                                      <SelectItem value="no">Não</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <Input
                                    placeholder="Saldo Mínimo"
                                    type="number"
                                    value={advancedFilters.minBalance}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        minBalance: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="Saldo Máximo"
                                    type="number"
                                    value={advancedFilters.maxBalance}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        maxBalance: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </div>
                  </StandardModalDialog>
                );
              })()}

            {/* Inactivity Alert Banner */}
            {!dismissedInactivityAlert &&
              users.filter((u) => u.auto_paused).length > 0 && (
                <div className="mx-4 mt-3 mb-1 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {users.filter((u) => u.auto_paused).length} usuário
                      {users.filter((u) => u.auto_paused).length !== 1
                        ? "s"
                        : ""}{" "}
                      sem acesso há mais de 90 dias
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Esses usuários foram pausados automaticamente. Revise e
                      decida: bloquear, reativar ou arquivar.
                    </p>
                  </div>
                  <button
                    onClick={() => setDismissedInactivityAlert(true)}
                    className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

            {/* Users Table */}
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="overflow-x-auto allka-table-scroll-body"
            >
              <table className="w-full text-xs min-w-[960px]">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    <th
                      className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                      style={{ position: "sticky", left: 0, top: 0, zIndex: 3, minWidth: 128, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(100,116,139,0.18)" }}
                    >
                      Ações
                    </th>
                    {ALL_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                      <th
                        key={col.key}
                        className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none [&_button]:!text-[11px]"
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          background: "var(--table-head)",
                          boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                          borderRight: "1px solid rgba(148,163,184,0.16)",
                        }}
                      >
                        <div className="inline-flex items-center gap-1">
                          {col.key === "codigo" && (
                            <SortableHeader
                              label={col.label}
                              field="user_code"
                              type="text"
                              sortKey={userSortKey ? String(userSortKey) : null}
                              sortDir={userSortDir}
                              onSort={handleUserSort}
                            />
                          )}
                          {col.key === "usuario" && (
                            <SortableHeader
                              label={col.label}
                              field="name"
                              type="text"
                              sortKey={userSortKey ? String(userSortKey) : null}
                              sortDir={userSortDir}
                              onSort={handleUserSort}
                            />
                          )}
                          {col.key === "contato" && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">{col.label}</span>
                          )}
                          {col.key === "vinculo" && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">{col.label}</span>
                          )}
                          {col.key === "tipo_funcao" && (
                            <SortableHeader
                              label={col.label}
                              field="account_type"
                              type="status"
                              sortKey={userSortKey ? String(userSortKey) : null}
                              sortDir={userSortDir}
                              onSort={handleUserSort}
                              columnFilters={columnFilters}
                              onFilter={toggleColumnFilter}
                              onClearFilter={clearColumnFilter}
                              filterValues={["admin", "company", "agency", "parceiro", "lider", "nomad"]}
                            />
                          )}
                          {col.key === "status" && (
                            <SortableHeader
                              label={col.label}
                              field="is_active"
                              type="status"
                              sortKey={userSortKey ? String(userSortKey) : null}
                              sortDir={userSortDir}
                              onSort={handleUserSort}
                              columnFilters={columnFilters}
                              onFilter={toggleColumnFilter}
                              onClearFilter={clearColumnFilter}
                              filterValues={["true", "false"]}
                            />
                          )}
                          {col.key === "ultimo_acesso" && (
                            <SortableHeader
                              label={col.label}
                              field="inactivity_bucket"
                              type="status"
                              sortKey={userSortKey ? String(userSortKey) : null}
                              sortDir={userSortDir}
                              onSort={handleUserSort}
                              columnFilters={columnFilters}
                              onFilter={toggleColumnFilter}
                              onClearFilter={clearColumnFilter}
                              filterValues={[
                                "never",
                                "today",
                                "7days",
                                "30days",
                                "inactive_30",
                                "inactive_60",
                                "inactive_90",
                              ]}
                            />
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-slate-300 dark:text-slate-600 cursor-help text-[10px]">ⓘ</span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[200px]">{col.info}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedUsers.map((user, i) => {
                    const accountBadge = getAccountTypeBadge(
                      user.account_type,
                      user.role,
                    );
                    const canDelete =
                      user.id !== currentUserId &&
                      !(user.is_admin && user.role === "admin");

                    return (
                      <tr
                        key={user.id}
                        className={`group transition-colors ${
                          i % 2 === 0
                            ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                            : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"
                        }`}
                      >
                        {/* Actions — pinned left: +, ver, bloquear/desbloquear, excluir */}
                        <td
                          className={`px-1 py-2 transition-colors ${
                            i % 2 === 0
                              ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                              : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                          }`}
                          style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 128, borderRight: "1px solid rgba(100,116,139,0.18)" }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInfoPanel(user);
                                    }}
                                    className="h-[21px] w-[21px] flex items-center justify-center rounded-full bg-[#2558FF] text-white shadow-[0_2px_6px_rgba(37,88,255,0.35)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:shadow-[0_2px_10px_rgba(110,44,150,0.5)] transition-all"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">Clique para visualizar todas as informações</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleUserAction(user, "view")}
                                    className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  Ver Detalhes
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleUserAction(user, "edit")}
                                    className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  Editar
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleUserAction(user, "block")}
                                    className={`h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150 ${
                                      user.is_active ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"
                                    }`}
                                  >
                                    {user.is_active ? (
                                      <UserX className="h-3.5 w-3.5" />
                                    ) : (
                                      <Shield className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  {user.is_active ? "Bloquear" : "Desbloquear"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleUserAction(user, "delete")}
                                    disabled={!canDelete}
                                    className={`h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all duration-150 ${
                                      canDelete
                                        ? "hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px"
                                        : "opacity-40 cursor-not-allowed"
                                    }`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  {!canDelete
                                    ? "Não pode deletar este usuário"
                                    : "Deletar usuário"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>

                        {visibleCols.has("codigo") && (
                          <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {(() => {
                                const n = userCodeToNum(user.user_code);
                                return n ? `User_${n}` : user.user_code || "—";
                              })()}
                            </span>
                          </td>
                        )}

                        {visibleCols.has("usuario") && (
                          <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <Avatar className="h-10 w-10 shadow-sm">
                                  <AvatarFallback
                                    className={`text-xs font-bold text-white bg-gradient-to-br ${
                                      user.account_type === "admin"
                                        ? "from-indigo-500 to-indigo-800"
                                        : user.account_type === "company" ||
                                            user.account_type === "empresas"
                                          ? "from-violet-500 to-purple-700"
                                          : user.account_type === "agency" ||
                                              user.account_type === "agencias"
                                            ? "from-orange-500 to-rose-600"
                                            : user.account_type === "parceiro" ||
                                                user.account_type === "partner"
                                              ? "from-pink-500 to-rose-700"
                                              : user.account_type === "lider" ||
                                                  user.account_type === "leader"
                                                ? "from-amber-500 to-orange-700"
                                                : "from-blue-500 to-blue-700"
                                    }`}
                                  >
                                    {user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute -bottom-0.5 -right-0.5 scale-75">
                                        {getOnlineStatusIndicator(
                                          user.online_status,
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                      {user.online_status === "online" &&
                                        "Online agora"}
                                      {user.online_status === "offline" &&
                                        "Offline"}
                                      {user.online_status === "busy" && "Ocupado"}
                                      {user.online_status === "away" && "Ausente"}
                                      {user.last_login && (
                                        <div>
                                          Última atividade:{" "}
                                          {new Date(
                                            user.last_login,
                                          ).toLocaleDateString("pt-BR")}{" "}
                                          às{" "}
                                          {new Date(
                                            user.last_login,
                                          ).toLocaleTimeString("pt-BR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                  {user.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}

                        {visibleCols.has("contato") && (
                          <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePhoneCall(user.phone)}
                                      className="h-5 w-5 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded"
                                    >
                                      <Phone className="h-2.5 w-2.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    Ligar
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleWhatsApp(user.phone)}
                                      className="h-5 w-5 p-0 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded"
                                    >
                                      <MessageCircle className="h-2.5 w-2.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    WhatsApp
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        )}

                        {visibleCols.has("tipo_funcao") && (
                          <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                            <div className="space-y-0.5">
                              <NeonBadge color={accountBadge.badgeColor}>
                                {accountBadge.label}
                              </NeonBadge>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {getRoleLabel(user.role)}
                              </p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {user.has_lgpd_consent ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 w-fit cursor-default dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        LGPD
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 w-fit cursor-default dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                                        <XCircle className="h-2.5 w-2.5" />
                                        LGPD
                                      </span>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {user.has_lgpd_consent ? "Consentimento LGPD registrado" : "Consentimento LGPD pendente"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        )}

                        {visibleCols.has("vinculo") && (
                          <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                            {(() => {
                              const linked = getLinkedAccount(user);
                              if (linked === "unknown")
                                return (
                                  <div className="space-y-1">
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Tipo desconhecido</p>
                                    <NeonBadge color="amber">TIPO DESCONHECIDO</NeonBadge>
                                  </div>
                                );
                              if (!linked)
                                return (
                                  <div className="space-y-1">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Sem vínculo</p>
                                    <NeonBadge color="gray">NÃO VINCULADO</NeonBadge>
                                  </div>
                                );
                              const linkBadge = getAccountTypeBadge(user.profile_link_type, user.role);
                              return (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                                    {linked.name}
                                  </p>
                                  <NeonBadge color={linkBadge.badgeColor}>{linkBadge.label.toUpperCase()}</NeonBadge>
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        {visibleCols.has("status") && (
                          <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                            <div className="space-y-1">
                              {user.auto_paused ? (
                                <span className="allka-badge allka-badge-status-pausado">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-500" />
                                  Pausado
                                </span>
                              ) : (
                                <span
                                  className={
                                    user.is_active
                                      ? "allka-badge allka-badge-status-ativo"
                                      : "allka-badge allka-badge-status-bloqueado"
                                  }
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                                  {user.is_active ? "Ativo" : "Bloqueado"}
                                </span>
                              )}
                              {user.accessed_after_inactivity_pause && (
                                <NeonBadge
                                  color="amber"
                                  tooltip="Usuário pausado por inatividade acessou recentemente. A conta permanece pausada até revisão administrativa."
                                >
                                  Acesso após pausa
                                </NeonBadge>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleCols.has("ultimo_acesso") && (
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                {user.last_login
                                  ? new Date(user.last_login).toLocaleDateString(
                                      "pt-BR",
                                    )
                                  : "Nunca"}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user.last_login
                                  ? new Date(user.last_login).toLocaleTimeString(
                                      "pt-BR",
                                      { hour: "2-digit", minute: "2-digit" },
                                    )
                                  : ""}
                              </p>
                              {user.inactivity_bucket === "inactive_30" && (
                                <NeonBadge color="amber" tooltip="Sem acesso há mais de 30 dias.">30d+</NeonBadge>
                              )}
                              {user.inactivity_bucket === "inactive_60" && (
                                <NeonBadge color="orange" tooltip="Sem acesso há mais de 60 dias.">60d+</NeonBadge>
                              )}
                              {user.inactivity_bucket === "inactive_90" && (
                                <NeonBadge color="red" tooltip="Sem acesso há mais de 90 dias — usuário pausado automaticamente.">⚠ 90d+</NeonBadge>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {paginatedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Users className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nenhum usuário encontrado
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Tente ajustar os filtros ou busca
                </p>
              </div>
            )}

          </div>

          {/* Row 3 — bottom mirror of row 2 (items-per-page + count + scrollbar + pagination) */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
              <div className="flex items-center gap-3">
                <ItemsPerPageSelect
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                  variant="bottom"
                />
                <CountText side="top" />
              </div>

              {hasHorizontalOverflow && (
                <div
                  ref={bottomScrollRef}
                  onScroll={handleBottomBarScroll}
                  title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                  className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                  style={{ height: 12 }}
                >
                  <div style={{ minWidth: 960, height: 1 }} />
                </div>
              )}

              {totalPages > 1 && <PaginationControls />}
            </div>
          )}
      </div>
      </div>
      </div>

      {/* Column config panel */}
      <StandardModalDialog
        open={colConfigOpen}
        onClose={() => setColConfigOpen(false)}
        title="Configurar colunas"
        subtitle="Escolha quais colunas aparecem na tabela"
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-2">
          {ALL_COLUMNS.map((col) => (
            <label key={col.key} className={`flex items-center gap-2 text-sm py-1 ${col.key === "usuario" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={visibleCols.has(col.key)}
                disabled={col.key === "usuario"}
                onChange={() => toggleCol(col.key)}
              />
              {col.label}
            </label>
          ))}
        </div>
      </StandardModalDialog>

      {/* "+" info panel — real user data already loaded in the table, no extra fetch needed */}
      {/* Detalhes do usuário — modal centralizado (Dialog nativo cobre backdrop,
          fechar por X/clique-fora/Esc). safe() nunca deixa undefined/null/NaN
          vazar pra tela — sempre "—" como fallback. */}
      {infoPanelUser && (() => {
        const safe = (v: unknown) => {
          if (v === null || v === undefined) return "—";
          if (typeof v === "number" && Number.isNaN(v)) return "—";
          if (typeof v === "string" && v.trim() === "") return "—";
          return v as React.ReactNode;
        };
        const safeBool = (v: unknown) => (v === true ? "Sim" : v === false ? "Não" : "—");
        const safeDate = (v: unknown, withTime = false) => {
          if (!v) return "—";
          const d = new Date(v as string);
          if (Number.isNaN(d.getTime())) return "—";
          return withTime ? d.toLocaleString("pt-BR") : d.toLocaleDateString("pt-BR");
        };
        return (
          <StandardModalDialog
            open={infoPanelOpen}
            onClose={() => setInfoPanelOpen(false)}
            title={
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAvatarLightboxOpen(true)}
                  className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
                  title="Ver foto ampliada"
                >
                  <Avatar className="h-9 w-9 shadow-md ring-2 ring-white/30 hover:ring-white/60 cursor-pointer transition-all">
                    <AvatarFallback className="text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700">
                      {infoPanelUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <span>Detalhes do usuário</span>
              </div>
            }
            subtitle={`${safe(infoPanelUser.name)} · ${safe(infoPanelUser.email)}`}
          >
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Dados do usuário
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Contato</p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            {safe(infoPanelUser.email)}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 mt-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            {safe(infoPanelUser.phone)}
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                            Usuário: {safe(infoPanelUser.username)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Tipo · Função</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {getAccountTypeBadge(infoPanelUser.account_type, infoPanelUser.role).label} · {getRoleLabel(infoPanelUser.role)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Status</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={
                                infoPanelUser.auto_paused
                                  ? "allka-badge allka-badge-status-pausado"
                                  : infoPanelUser.is_active
                                    ? "allka-badge allka-badge-status-ativo"
                                    : "allka-badge allka-badge-status-bloqueado"
                              }
                            >
                              {infoPanelUser.auto_paused ? "Pausado" : infoPanelUser.is_active ? "Ativo" : "Bloqueado"}
                            </span>
                            {infoPanelUser.accessed_after_inactivity_pause && (
                              <NeonBadge
                                color="amber"
                                tooltip="Usuário pausado por inatividade acessou recentemente. A conta permanece pausada até revisão administrativa."
                              >
                                Acesso após pausa
                              </NeonBadge>
                            )}
                          </div>
                          {infoPanelUser.accessed_after_inactivity_pause && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              Conta pausada por inatividade. Houve acesso recente, mas ela permanece pausada até revisão.
                              {infoPanelUser.inactivity_paused_accessed_at && (
                                <> Último acesso pós-pausa: {safeDate(infoPanelUser.inactivity_paused_accessed_at, true)}.</>
                              )}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Revisão de reativação pendente: {safeBool(infoPanelUser.reactivation_review_required)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Último acesso</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {infoPanelUser.last_login ? safeDate(infoPanelUser.last_login, true) : "Nunca acessou"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Conta vinculada</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => infoPanelUser.account_type === "empresas" && openLinkPanel(infoPanelUser)}
                                    disabled={infoPanelUser.account_type !== "empresas"}
                                    className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-300 disabled:no-underline dark:disabled:text-slate-600 disabled:cursor-not-allowed"
                                  >
                                    Alterar vínculo
                                  </button>
                                </TooltipTrigger>
                                {infoPanelUser.account_type !== "empresas" && (
                                  <TooltipContent className="text-xs max-w-[220px]">
                                    Vínculo de empresa só é suportado para usuários do tipo Empresa.
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {(() => {
                            const linked = getLinkedAccount(infoPanelUser);
                            if (linked === "unknown")
                              return (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-slate-700 dark:text-slate-300">Tipo desconhecido</p>
                                  <NeonBadge color="amber">TIPO DESCONHECIDO</NeonBadge>
                                </div>
                              );
                            if (!linked)
                              return (
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-slate-700 dark:text-slate-300">Sem vínculo</p>
                                  <NeonBadge color="gray">NÃO VINCULADO</NeonBadge>
                                </div>
                              );
                            const linkBadge = getAccountTypeBadge(infoPanelUser.profile_link_type, infoPanelUser.role);
                            return (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-700 dark:text-slate-300">{linked.name}</p>
                                <NeonBadge color={linkBadge.badgeColor}>{linkBadge.label.toUpperCase()}</NeonBadge>
                              </div>
                            );
                          })()}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Status do vínculo: {safe(infoPanelUser.profile_link_status)}
                          </p>
                        </div>
                        {infoPanelUser.leader_areas && infoPanelUser.leader_areas.length > 0 && (
                          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Áreas de liderança</p>
                            <div className="flex flex-wrap gap-1.5">
                              {infoPanelUser.leader_areas.map((area: string) => (
                                <NeonBadge key={area} color="amber">{area}</NeonBadge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Membro desde</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {safeDate(infoPanelUser.created_at)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Atualizado em</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {safeDate(infoPanelUser.updated_at)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">ID público</p>
                          <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                            {(() => {
                              const n = userCodeToNum(infoPanelUser.user_code);
                              return n ? `User_${n}` : safe(infoPanelUser.user_code);
                            })()}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">ID técnico</p>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{safe(infoPanelUser.id)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 sm:col-span-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">IDs técnicos de vínculo</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                            <p className="truncate">Agency: {safe(infoPanelUser.agency_id)}</p>
                            <p className="truncate">Company: {safe(infoPanelUser.company_id)}</p>
                            <p className="truncate">Partner: {safe(infoPanelUser.partner_profile_id)}</p>
                            <p className="truncate">Nômade: {safe(infoPanelUser.nomad_id)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">LGPD</h3>
                      <div className="flex items-center gap-2">
                        {infoPanelUser.has_lgpd_consent ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        <div>
                          <p className={infoPanelUser.has_lgpd_consent ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-rose-700 dark:text-rose-300"}>
                            {infoPanelUser.has_lgpd_consent ? "Consentimento LGPD registrado" : "Consentimento LGPD pendente"}
                          </p>
                          {infoPanelUser.has_lgpd_consent && infoPanelUser.lgpd_consent_at && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Aceito em: {safeDate(infoPanelUser.lgpd_consent_at, true)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
          </StandardModalDialog>
        );
      })()}

      {/* Foto ampliada do usuário — lightbox simples sobre o modal de detalhes */}
      {avatarLightboxOpen &&
        infoPanelUser &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
            onClick={() => setAvatarLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setAvatarLightboxOpen(false)}
              className="absolute top-5 right-5 rounded-lg transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 p-1.5"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="size-7 text-white drop-shadow-md" />
            </button>
            <Avatar className="h-56 w-56 shadow-2xl ring-4 ring-white/30" onClick={(e) => e.stopPropagation()}>
              <AvatarFallback className="text-6xl font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700">
                {infoPanelUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>,
          document.body,
        )}

      {/* Alterar vínculo — vincular/desvincular/trocar a empresa do usuário */}
      <SlidePanel
        open={linkPanelOpen}
        onClose={closeLinkPanel}
        title="Alterar vínculo"
        subtitle={linkTargetUser?.name}
        widthMode="compact"
        compactWidth={420}
        footer={
          <div className="flex items-center justify-end gap-2 p-4">
            <Button variant="outline" size="sm" onClick={closeLinkPanel} disabled={linkSaving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveLink} disabled={linkSaving} className="btn-brand border-0">
              {linkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Salvar
            </Button>
          </div>
        }
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link2 className="h-4 w-4" />
            <p className="text-xs">
              Vincule este usuário a uma empresa, troque a empresa atual, ou desvincule por completo. Somente o Admin pode
              alterar esse vínculo.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Empresa vinculada
            </p>
            <Select value={linkCompanyId || "__none__"} onValueChange={(v) => setLinkCompanyId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={companiesLoading ? "Carregando empresas..." : "Selecione uma empresa"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem empresa vinculada</SelectItem>
                {companiesForSelect.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companiesLoading && (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando lista de empresas...
              </p>
            )}
          </div>
        </div>
      </SlidePanel>

      <UserViewSlidePanel
        open={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          navigate("/admin/usuarios", { replace: true });
        }}
        onRefresh={refetchUsers}
        user={selectedUser}
        startInEditMode={viewStartInEditMode}
      />

      <UserCreateSlidePanel
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onUserCreated={() => {
          refetchUsers();
          window.dispatchEvent(new Event("allka:admin-counts-changed"));
          setShowCreateUser(false);
        }}
      />

      <ConfirmationDialog
        open={isDeleteAlertOpen && !!selectedUser}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={() => handleStatusConfirmation("Desconhecido", "indefinite")}
        title={
          selectedUser?.is_active ? "Bloquear Usuário" : "Desbloquear Usuário"
        }
        message={
          selectedUser?.is_active
            ? `Tem certeza que deseja bloquear o usuário "${selectedUser?.name}"? Ele não poderá acessar a plataforma enquanto estiver bloqueado.`
            : `Tem certeza que deseja desbloquear o usuário "${selectedUser?.name}"? Ele voltará a ter acesso à plataforma.`
        }
        confirmText={selectedUser?.is_active ? "Bloquear" : "Desbloquear"}
        cancelText="Cancelar"
        destructive={selectedUser?.is_active}
      />

      <ConfirmationDialog
        open={pendingClose !== null}
        onClose={() => setPendingClose(null)}
        onConfirm={() => {
          pendingClose?.();
          setPendingClose(null);
        }}
        title="Alterações não salvas"
        message="Você tem alterações não salvas. Deseja sair sem salvar?"
        confirmText="Sair sem salvar"
        cancelText="Cancelar"
        destructive={false}
      />

      {selectedUser && (
        <StandardModalDialog
          open={isDeleteUserAlertOpen}
          onClose={() => {
            if (!isDeleteLoading) setIsDeleteUserAlertOpen(false);
          }}
          title="Excluir Usuário"
          size="compact"
          footer={
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsDeleteUserAlertOpen(false)}
                disabled={isDeleteLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-9 text-sm font-semibold text-white border-0 shadow-sm bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDeleteUser}
                disabled={isDeleteLoading || !deletionReason.trim()}
              >
                {isDeleteLoading ? (
                  <ButtonLoader text="Excluindo..." />
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir Definitivamente
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
                Tem certeza que deseja excluir este usuário? Esta ação é{" "}
                <strong>irreversível</strong>.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedUser.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedUser.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Motivo da Exclusão <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Descreva o motivo da exclusão para fins de auditoria (mínimo 10 caracteres)"
                value={deletionReason}
                onChange={(e) => {
                  setDeletionReason(e.target.value);
                  if (deletionReasonError) setDeletionReasonError("");
                }}
                disabled={isDeleteLoading}
                className="text-sm resize-none focus-visible:ring-red-500"
                rows={3}
              />
              {deletionReasonError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {deletionReasonError}
                </p>
              )}
              <p className="text-xs text-slate-400">
                Caracteres: {deletionReason.length}/10 (mínimo)
              </p>
            </div>
          </div>
        </StandardModalDialog>
      )}
    </div>
    </div>
  );
}
