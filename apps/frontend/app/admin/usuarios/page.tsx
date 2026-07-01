// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { useNavigate, useParams } from "react-router-dom";
import { ButtonLoader, PageLoader } from "@/components/ui/loading";
import { ExportButton } from "@/components/export-button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import type { User } from "@/types/user";
import { UserViewSlidePanel } from "@/components/user-view-slide-panel";
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
import { PageHeader } from "@/components/page-header";

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

export default function UsuariosPage() {
  const { addUser: addPlatformUser, updateUser: updatePlatformUser } =
    usePlatformUsers();
  const {
    users: apiUsers,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    createUser,
    updateUser,
    deleteUser: apiDeleteUser,
  } = useUsers();
  const { toast } = useToast();
  const { sidebarWidth, sidebarSettings, previewTheme } = useSidebar();
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

  // Deep-link: open user panel from URL param
  useEffect(() => {
    if (!urlUserId) return;
    apiClient
      .getUser(urlUserId)
      .then((user: any) => {
        setSelectedUser(user);
        setIsViewDialogOpen(true);
      })
      .catch(() => {
        setSelectedUser({ id: urlUserId } as any);
        setIsViewDialogOpen(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId]);
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
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleteUserAlertOpen, setIsDeleteUserAlertOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionReasonError, setDeletionReasonError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
    statuses: [] as string[],
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

  // Demo last_login dates injected when the API doesn't return the field.
  // Covers all inactivity buckets so the UI can be tested end-to-end.
  const _now = Date.now();
  const DEMO_LAST_LOGINS: (string | null)[] = [
    new Date(_now - 0).toISOString(), // idx 0 → hoje
    new Date(_now - 2 * 86400000).toISOString(), // idx 1 → 2 dias (7days)
    new Date(_now - 5 * 86400000).toISOString(), // idx 2 → 5 dias (7days)
    new Date(_now - 15 * 86400000).toISOString(), // idx 3 → 15 dias (30days)
    new Date(_now - 25 * 86400000).toISOString(), // idx 4 → 25 dias (30days)
    new Date(_now - 35 * 86400000).toISOString(), // idx 5 → 35 dias (inactive_30)
    new Date(_now - 50 * 86400000).toISOString(), // idx 6 → 50 dias (inactive_30)
    new Date(_now - 65 * 86400000).toISOString(), // idx 7 → 65 dias (inactive_60)
    new Date(_now - 80 * 86400000).toISOString(), // idx 8 → 80 dias (inactive_60)
    new Date(_now - 95 * 86400000).toISOString(), // idx 9 → 95 dias (inactive_90)
    new Date(_now - 130 * 86400000).toISOString(), // idx 10 → 130 dias (inactive_90)
    null, // idx 11 → nunca acessou
  ];

  useEffect(() => {
    // Map API users — compute inactivity bucket and auto_paused flag
    const mapped = apiUsers.map((u: any, idx: number) => {
      // Use API last_login if present; otherwise inject demo date for UI testing
      const last_login =
        u.last_login ?? DEMO_LAST_LOGINS[idx % DEMO_LAST_LOGINS.length];
      const bucket = computeInactivityBucket(last_login);
      return {
        ...u,
        last_login,
        is_active: u.is_active ?? true,
        online_status: "offline",
        account_type: u.account_type || "empresas",
        inactivity_bucket: bucket,
        auto_paused: bucket === "inactive_90",
      };
    });
    setUsers(mapped);
    setFilteredUsers(mapped);
    setCurrentPage(1);
  }, [apiUsers]);

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
          user.lgpd?.consent_given === false ? "sem consentimento lgpd" : "",
          user.lgpd?.deletion_requested ? "exclusão solicitada" : "",
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
          if (type === "company")
            return at === "empresas" || at === "empresa" || at === "company";
          if (type === "nomad")
            return at === "nomades" || at === "nomade" || at === "nomad";
          if (type === "agency")
            return at === "agencias" || at === "agencia" || at === "agency";
          return false;
        });
        if (!match) return false;
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

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

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
        setIsViewDialogOpen(true);
        navigate(`/admin/usuarios/${user.id}`, { replace: true });
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
        return "Admin Agência";
      case "agency_user":
        return "Usuário Agência";
      case "nomad":
        return "Nômade";
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

    if (normalizedType === "company" || normalizedType === "empresas")
      return {
        label: "Company",
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:to-purple-900",
      };
    if (normalizedType === "agency" || normalizedType === "agencias")
      return {
        label: "Agency",
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:to-orange-900",
      };
    if (normalizedType === "nomad" || normalizedType === "nomades")
      return {
        label: "Nomad",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:to-blue-900",
      };
    if (role === "financial")
      return {
        label: "Financial",
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:to-orange-900",
      };
    if (role === "team_allka")
      return {
        label: "Team allka",
        color:
          "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:to-indigo-900",
      };
    return {
      label: "Outro",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:to-gray-900",
    };
  };

  // ── Sparkline ─────────────────────────────────────────────────────────────
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const w = 80,
      h = 28;
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
  const adminUsers = users.filter((u) => u.is_admin).length;
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
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider leading-tight truncate">
              {label}
            </p>
            <div className="bg-white/20 rounded-md p-1 flex-shrink-0 ml-1">
              <Icon className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-bold leading-none text-white">
                {value}
              </p>
              <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-white/20">
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
    <div className="space-y-5" ref={pageRef}>
      <PageHeader
        title="Usuários"
        description="Gerencie todos os usuários da plataforma"
        actions={<>
          <ExportButton pageRef={pageRef} filename="usuarios" />
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Novo Usuário
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo usuário</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

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
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Card Top Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nome, e-mail, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Items per page + result count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              variant="top"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredUsers.length !== users.length ? (
                <>
                  de{" "}
                  <span className="font-semibold text-blue-500">
                    {filteredUsers.length}
                  </span>{" "}
                  de {users.length}
                </>
              ) : (
                <>
                  de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {users.length}
                  </span>{" "}
                  usuário{users.length !== 1 ? "s" : ""}
                </>
              )}
            </span>
          </div>

          {/* Filter Button */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3.5 text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </Button>

          {/* Pagination */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
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
                  className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    page === currentPage
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <CardContent className="p-0">
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
                return (
                  <div
                    className="fixed z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
                    style={{
                      left: sidebarWidth,
                      top: headerHeight,
                      bottom: footerHeight,
                      right: 0,
                    }}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (unsavedChanges) {
                        setPendingClose(() => closeFn);
                        return;
                      }
                      closeFn();
                    }}
                  >
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
                      {/* Header — follows sidebar theme */}
                      <div
                        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                        style={getHeaderStyle()}
                      >
                        <div>
                          <h2 className="text-sm font-bold text-white">
                            Filtros Avançados
                          </h2>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            {unsavedChanges
                              ? "• Alterações não salvas"
                              : selectedFilterId && !isEditingFilter
                                ? "Filtro carregado"
                                : "Configure e aplique filtros"}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (unsavedChanges) {
                              setPendingClose(() => closeFn);
                              return;
                            }
                            closeFn();
                          }}
                          className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

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
                                    {["company", "nomad", "agency"].map(
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

                      {/* Footer — compact, empresas-style */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
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
                    </div>
                  </div>
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
              className="overflow-auto allka-table-scroll"
              style={{ maxHeight: "calc(100vh - 18rem)" }}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    <th
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.25)",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      <SortableHeader
                        label="Usuário"
                        field="name"
                        type="text"
                        sortKey={userSortKey ? String(userSortKey) : null}
                        sortDir={userSortDir}
                        onSort={handleUserSort}
                      />
                    </th>
                    <th
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.25)",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      Contato
                    </th>
                    <th
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.25)",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      <SortableHeader
                        label="Tipo / Função"
                        field="account_type"
                        type="status"
                        sortKey={userSortKey ? String(userSortKey) : null}
                        sortDir={userSortDir}
                        onSort={handleUserSort}
                        columnFilters={columnFilters}
                        onFilter={toggleColumnFilter}
                        onClearFilter={clearColumnFilter}
                        filterValues={["company", "nomad", "agency"]}
                      />
                    </th>
                    <th
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.25)",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      <SortableHeader
                        label="Status"
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
                    </th>
                    <th
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.25)",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      <SortableHeader
                        label="Último Acesso"
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
                    </th>
                    <th
                      className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      style={{
                        position: "sticky",
                        right: 0,
                        top: 0,
                        zIndex: 3,
                        borderLeft: "1px solid rgba(148,163,184,0.25)",
                        background: "var(--table-head)",
                        boxShadow:
                          "-2px 0 6px rgba(0,0,0,0.06), 0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedUsers.map((user) => {
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
                        className={`group transition-colors cursor-pointer ${
                          paginatedUsers.indexOf(user) % 2 === 0
                            ? "bg-[var(--table-row)] hover:bg-[var(--table-row-hover)]"
                            : "bg-[var(--table-row-alt)] hover:bg-[var(--table-row-hover)]"
                        }`}
                      >
                        <td
                          className="px-5 py-3.5"
                          style={{
                            borderRight: "1px solid rgba(148,163,184,0.15)",
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback
                                  className={`text-xs font-semibold ${
                                    user.account_type === "company" ||
                                    user.account_type === "empresas"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                      : user.account_type === "agency" ||
                                          user.account_type === "agencias"
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
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
                              <p className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          className="px-5 py-3.5"
                          style={{
                            borderRight: "1px solid rgba(148,163,184,0.15)",
                          }}
                        >
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
                        <td
                          className="px-5 py-3.5"
                          style={{
                            borderRight: "1px solid rgba(148,163,184,0.15)",
                          }}
                        >
                          <div className="space-y-0.5">
                            <Badge
                              className={`text-xs px-2 py-0.5 ${accountBadge.color}`}
                            >
                              {accountBadge.label}
                            </Badge>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {getRoleLabel(user.role)}
                            </p>
                            {!user.lgpd?.consent_given && (
                              <Badge className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 border-0">
                                Sem consentimento LGPD
                              </Badge>
                            )}
                            {user.lgpd?.deletion_requested && (
                              <Badge className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border-0">
                                Exclusão solicitada
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-5 py-3.5"
                          style={{
                            borderRight: "1px solid rgba(148,163,184,0.15)",
                          }}
                        >
                          {user.auto_paused ? (
                            <span className="allka-badge allka-badge-status-pausado">
                              ⏸ Pausado
                            </span>
                          ) : (
                            <span
                              className={
                                user.is_active
                                  ? "allka-badge allka-badge-status-ativo"
                                  : "allka-badge allka-badge-status-bloqueado"
                              }
                            >
                              {user.is_active ? "Ativo" : "Bloqueado"}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-5 py-3.5"
                          style={{
                            borderRight: "1px solid rgba(148,163,184,0.15)",
                          }}
                        >
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
                              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                30d+
                              </span>
                            )}
                            {user.inactivity_bucket === "inactive_60" && (
                              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                60d+
                              </span>
                            )}
                            {user.inactivity_bucket === "inactive_90" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                ⚠ 90d+
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-5 py-3.5"
                          style={{
                            position: "sticky",
                            right: 0,
                            zIndex: 1,
                            background:
                              paginatedUsers.indexOf(user) % 2 === 0
                                ? "var(--table-row)"
                                : "var(--table-row-alt)",
                            borderLeft: "1px solid rgba(148,163,184,0.25)",
                          }}
                        >
                          <div className="flex items-center justify-end gap-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUserAction(user, "view")
                                    }
                                    className="h-5 w-5 p-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  >
                                    <Eye className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  Ver Detalhes
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUserAction(user, "block")
                                    }
                                    className={`h-5 w-5 p-0 rounded ${
                                      user.is_active
                                        ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                                        : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                    }`}
                                  >
                                    {user.is_active ? (
                                      <UserX className="h-2.5 w-2.5" />
                                    ) : (
                                      <Shield className="h-2.5 w-2.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  {user.is_active ? "Bloquear" : "Desbloquear"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUserAction(user, "delete")
                                    }
                                    disabled={!canDelete}
                                    className={`h-5 w-5 p-0 rounded ${
                                      canDelete
                                        ? "text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                        : "opacity-40 cursor-not-allowed"
                                    }`}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  {!canDelete
                                    ? "Não pode deletar este usuário"
                                    : "Deletar usuário"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
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

            {/* Bottom Pagination */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
                <div className="flex items-center gap-2">
                  <ItemsPerPageSelect
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                    variant="bottom"
                  />
                  <span className="text-xs text-slate-400">
                    de {filteredUsers.length} usuário
                    {filteredUsers.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <span
                        key={index}
                        className="text-xs text-slate-300 px-0.5"
                      >
                        ·
                      </span>
                    ) : (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(Number(page))}
                        className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                          page === currentPage
                            ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isViewDialogOpen && (
        <UserViewSlidePanel
          open={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false);
            setSelectedUser(null);
            navigate("/admin/usuarios", { replace: true });
          }}
          onRefresh={refetchUsers}
          user={selectedUser}
        />
      )}

      <UserCreateSlidePanel
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onUserCreated={() => {
          refetchUsers();
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

      {isDeleteUserAlertOpen &&
        selectedUser &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
            onClick={() => {
              if (!isDeleteLoading) setIsDeleteUserAlertOpen(false);
            }}
          >
            <div
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />

              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <button
                  onClick={() => {
                    if (!isDeleteLoading) setIsDeleteUserAlertOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 pt-4 pb-4 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                    Excluir Usuário
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
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

              {/* Footer */}
              <div className="flex gap-3 px-6 pb-5">
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
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
