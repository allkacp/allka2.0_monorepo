// @ts-nocheck
import {
  Trash2,
  Edit2,
  Eye,
  Lock,
  Unlock,
  Shield,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  CheckCircle,
  PauseCircle,
  UserPlus,
  MapPin,
  Phone,
  CreditCard,
  AtSign,
  User,
  Camera,
  ZoomIn,
  Crosshair,
  Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { UserCreateSlidePanel } from "@/components/user-create-slide-panel";
import { usePlatformUsers } from "@/contexts/platform-users-context";
import type { Permission as PlatformPermission } from "@/types/user";
import { ALL_PROJECT_PERMISSIONS, MOCK_COMPANY_PROJECTS } from "@/types/user";

interface UserListItem {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: "online" | "offline";
  profile: string;
  lastAccess: string;
  createdAt: string;
  isBlocked: boolean;
  cpf?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  averageOnlineHours?: number;
  averageOfflineDays?: number;
  permissions?: UserPermissions;
  /** ID of the corresponding platform User record */
  platformUserId?: number;
  /** Platform-level permissions (flat list, managed by platform admin) */
  platform_permissions?: string[];
}

interface Permission {
  id: string;
  name: string;
  enabled: boolean;
}

interface UserPermissions {
  [key: string]: Permission[];
}

interface CompanyUsersTabProps {
  companyId: number | string;
  companyName: string;
  users?: UserListItem[];
  /** Called when a new user is created so the admin/usuarios page stays in sync */
  onUserCreated?: (user: any) => void;
}

const DEFAULT_USERS: UserListItem[] = [
  {
    id: 1,
    name: "Ana Silva",
    email: "ana.silva@empresa.com",
    avatar: "AS",
    status: "online",
    profile: "Administrador",
    lastAccess: "Há 2 horas",
    createdAt: "12/01/2024",
    isBlocked: false,
    cpf: "123.456.789-00",
    phone: "(11) 98765-4321",
    address: "Rua das Flores, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    averageOnlineHours: 2.5,
    averageOfflineDays: 1,
    permissions: {
      gestao: [
        { id: "hire_services", name: "Contratar serviços", enabled: true },
        { id: "insert_credit", name: "Inserir crédito", enabled: true },
        { id: "approve_payments", name: "Aprovar pagamentos", enabled: true },
      ],
      tasks: [
        { id: "create_tasks", name: "Criar tarefas", enabled: true },
        { id: "approve_tasks", name: "Aprovar tarefas", enabled: true },
        { id: "edit_tasks", name: "Editar tarefas", enabled: true },
        { id: "delete_tasks", name: "Excluir tarefas", enabled: false },
      ],
      projects: [
        { id: "create_projects", name: "Criar projetos", enabled: true },
        { id: "edit_projects", name: "Editar projetos", enabled: true },
        { id: "delete_projects", name: "Excluir projetos", enabled: false },
      ],
      users: [
        { id: "create_users", name: "Criar usuários", enabled: true },
        { id: "edit_users", name: "Editar usuários", enabled: true },
        { id: "block_users", name: "Bloquear usuários", enabled: true },
      ],
    },
  },
  {
    id: 2,
    name: "Carlos Santos",
    email: "carlos.santos@empresa.com",
    avatar: "CS",
    status: "online",
    profile: "Gerente",
    lastAccess: "Há 30 minutos",
    createdAt: "15/01/2024",
    isBlocked: false,
    cpf: "987.654.321-00",
    phone: "(11) 99876-5432",
    address: "Avenida Principal, 456",
    city: "São Paulo",
    state: "SP",
    zipCode: "02345-678",
    averageOnlineHours: 3.2,
    averageOfflineDays: 1.5,
  },
  {
    id: 3,
    name: "Marina Costa",
    email: "marina.costa@empresa.com",
    avatar: "MC",
    status: "offline",
    profile: "Operador",
    lastAccess: "Ontem",
    createdAt: "18/01/2024",
    isBlocked: false,
    cpf: "456.789.012-00",
    phone: "(11) 97654-3210",
    address: "Rua dos Pinheiros, 789",
    city: "São Paulo",
    state: "SP",
    zipCode: "03456-789",
    averageOnlineHours: 2.8,
    averageOfflineDays: 2,
  },
  {
    id: 4,
    name: "Paulo Oliveira",
    email: "paulo.oliveira@empresa.com",
    avatar: "PO",
    status: "offline",
    profile: "Operador",
    lastAccess: "2 dias atrás",
    createdAt: "10/01/2024",
    isBlocked: false,
    cpf: "789.012.345-00",
    phone: "(11) 96543-2109",
    address: "Rua da Paz, 321",
    city: "São Paulo",
    state: "SP",
    zipCode: "04567-890",
    averageOnlineHours: 2.2,
    averageOfflineDays: 3,
  },
  {
    id: 5,
    name: "Rita Alves",
    email: "rita.alves@empresa.com",
    avatar: "RA",
    status: "offline",
    profile: "Visualizador",
    lastAccess: "3 dias atrás",
    createdAt: "08/01/2024",
    isBlocked: true,
    cpf: "321.098.765-00",
    phone: "(11) 95432-1098",
    address: "Rua da Esperança, 654",
    city: "São Paulo",
    state: "SP",
    zipCode: "05678-901",
    averageOnlineHours: 1.8,
    averageOfflineDays: 5,
  },
];

const timelineData = [
  { day: "Seg", hours: 2.5 },
  { day: "Ter", hours: 3.2 },
  { day: "Qua", hours: 2.8 },
  { day: "Qui", hours: 3.5 },
  { day: "Sex", hours: 2.2 },
  { day: "Sab", hours: 1.8 },
  { day: "Dom", hours: 0.5 },
];

type UserColKey = "usuario" | "email" | "status" | "perfil" | "acoes";
const USER_COLS: { key: UserColKey; label: string; required?: boolean }[] = [
  { key: "usuario", label: "Usuário", required: true },
  { key: "email", label: "E-mail" },
  { key: "status", label: "Status" },
  { key: "perfil", label: "Perfil · Último acesso" },
  { key: "acoes", label: "Ações", required: true },
];
const USER_COL_DEFAULTS: Record<UserColKey, number> = {
  usuario: 210,
  email: 210,
  status: 115,
  perfil: 190,
  acoes: 72,
};

export function CompanyUsersTab({
  companyId,
  companyName,
  users,
  onUserCreated,
}: CompanyUsersTabProps) {
  const { sidebarWidth } = useSidebar();
  const {
    users: contextUsers,
    addUser,
    addCompanyLink,
    getUserById,
    upsertProjectMembership,
    removeProjectMembership,
    removeCompanyLink,
  } = usePlatformUsers();

  // Derive UserListItem list from platform-users context for this company
  const companyContextUsers = useMemo<UserListItem[]>(() => {
    const matched = contextUsers.filter(
      (u) =>
        u.company_associations?.some(
          (a) => String(a.company_id) === String(companyId),
        ) || String(u.company_id) === String(companyId),
    );
    if (matched.length === 0) return [];
    return matched.map((u) => {
      const assoc = u.company_associations?.find(
        (a) => String(a.company_id) === String(companyId),
      ) ?? { role: u.role ?? "company_user", company_permissions: {} as any };
      return {
        id: u.id,
        platformUserId: u.id,
        name: u.name,
        email: u.email,
        avatar: u.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        status: (u.online_status === "online" ? "online" : "offline") as
          | "online"
          | "offline",
        profile: assoc.role === "company_admin" ? "Administrador" : "Usuário",
        lastAccess: u.last_login
          ? new Date(u.last_login).toLocaleString("pt-BR")
          : "Nunca",
        createdAt: new Date(u.created_at).toLocaleDateString("pt-BR"),
        isBlocked: !u.is_active,
        phone: u.phone,
        permissions: assoc.company_permissions as any,
        platform_permissions: u.permissions,
      } as UserListItem;
    });
  }, [contextUsers, companyId]);

  const [userList, setUserList] = useState<UserListItem[]>(
    () =>
      users ??
      (companyContextUsers.length > 0 ? companyContextUsers : DEFAULT_USERS),
  );

  // Sync whenever context users change (additions, removals, edits) — skip if parent passes static list
  useEffect(() => {
    if (!users) {
      setUserList(companyContextUsers);
    }
  }, [companyContextUsers, users]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDetailsClosing, setIsDetailsClosing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<UserListItem> | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [permissionsMode, setPermissionsMode] = useState(false);
  const [permissionsData, setPermissionsData] =
    useState<UserPermissions | null>(null);
  const [initialPermissionsData, setInitialPermissionsData] =
    useState<UserPermissions | null>(null);
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);
  const [confirmSavePermissions, setConfirmSavePermissions] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState({
    open: false,
    pendingAction: null as (() => void) | null,
  });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showUserCreatePanel, setShowUserCreatePanel] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    profile: "User",
    status: "active",
  });
  const [confirmAddUser, setConfirmAddUser] = useState(false);

  // Avatar / crop states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropContext, setCropContext] = useState<"add" | "detail">("add");
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const CROP_SIZE = 192;
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  // Detail panel avatar states
  const [detailAvatarPreview, setDetailAvatarPreview] = useState<{
    [id: number]: string;
  }>({});
  const [detailOriginalRawSrc, setDetailOriginalRawSrc] = useState<
    string | null
  >(null);
  const [detailShowAvatarMenu, setDetailShowAvatarMenu] = useState(false);

  const handleAvatarClick = () => {
    if (avatarPreview) {
      setShowAvatarMenu((prev) => !prev);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDetailAvatarClick = () => {
    if (
      selectedUser &&
      (detailAvatarPreview[selectedUser.id] || selectedUser.avatar)
    ) {
      setDetailShowAvatarMenu((prev) => !prev);
    } else {
      detailFileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setOriginalRawSrc(src);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropContext("add");
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDetailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setDetailOriginalRawSrc(src);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropContext("detail");
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleCropMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart],
  );

  const handleCropMouseUp = () => setIsDragging(false);

  const handleCropConfirm = () => {
    if (!cropImgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const img = cropImgRef.current;
    // Replicate exactly the CSS transform: scale(cropZoom) centered + cropOffset translation
    const drawW = img.naturalWidth * cropZoom;
    const drawH = img.naturalHeight * cropZoom;
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2;
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    const result = canvas.toDataURL("image/jpeg", 0.92);
    if (cropContext === "detail" && selectedUser) {
      setDetailAvatarPreview((prev) => ({
        ...prev,
        [selectedUser.id]: result,
      }));
    } else {
      setAvatarPreview(result);
    }
    setCropOpen(false);
    setRawImageSrc(null);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility & resize
  const [visibleCols, setVisibleCols] = useState<Set<UserColKey>>(
    new Set(["usuario", "email", "status", "perfil", "acoes"]),
  );
  const [colWidths, setColWidths] =
    useState<Record<UserColKey, number>>(USER_COL_DEFAULTS);
  const resizingRef = useRef<{
    col: UserColKey;
    startX: number;
    startW: number;
  } | null>(null);
  const handleResizeStart = (col: UserColKey, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { col, startX: e.clientX, startW: colWidths[col] };
    const onMove = (mv: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = mv.clientX - resizingRef.current.startX;
      setColWidths((prev) => ({
        ...prev,
        [resizingRef.current!.col]: Math.max(
          60,
          resizingRef.current!.startW + delta,
        ),
      }));
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const toggleUserCol = (key: UserColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key) && !USER_COLS.find((c) => c.key === key)?.required)
        next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null as "block" | "delete" | null,
    userId: null as number | null,
  });

  const handleViewDetails = (user: UserListItem) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
    setIsDetailsClosing(false);
  };

  const handleCloseDetails = () => {
    setIsDetailsClosing(true);
    setTimeout(() => {
      setIsDetailsClosing(false);
      setIsDetailsOpen(false);
      setEditMode(false);
      setEditData(null);
      setPermissionsMode(false);
      setPermissionsData(null);
      setHasUnsavedChanges(false);
    }, 400);
  };

  const handleEditUser = () => {
    if (hasUnsavedChanges && (editMode || permissionsMode)) {
      setUnsavedChangesDialog({
        open: true,
        pendingAction: () => {
          setEditMode(true);
          if (selectedUser) {
            setEditData({
              name: selectedUser.name,
              email: selectedUser.email,
              phone: selectedUser.phone || "",
              address: selectedUser.address || "",
              city: selectedUser.city || "",
              state: selectedUser.state || "",
              zipCode: selectedUser.zipCode || "",
            });
          }
        },
      });
      return;
    }

    setEditMode(true);
    setPermissionsMode(false);
    setPermissionsData(null);
    setInitialPermissionsData(null);
    if (selectedUser) {
      setEditData({
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone || "",
        address: selectedUser.address || "",
        city: selectedUser.city || "",
        state: selectedUser.state || "",
        zipCode: selectedUser.zipCode || "",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData(null);
    setHasUnsavedChanges(false);
  };

  const handleSaveClick = () => {
    setConfirmSave(true);
  };

  const handleConfirmSave = () => {
    if (selectedUser && editData) {
      const updatedUser = { ...selectedUser, ...editData };
      setUserList((prevUsers) =>
        prevUsers.map((u) => (u.id === selectedUser.id ? updatedUser : u)),
      );
      setSelectedUser(updatedUser);
      setEditMode(false);
      setEditData(null);
      setConfirmSave(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleEditFieldChange = (field: string, value: string) => {
    setEditData((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasUnsavedChanges(true);
  };

  const comparePermissions = (
    perm1: UserPermissions | null,
    perm2: UserPermissions | null,
  ): boolean => {
    if (!perm1 || !perm2) return false;
    return JSON.stringify(perm1) === JSON.stringify(perm2);
  };

  const handleOpenPermissions = () => {
    if (hasUnsavedChanges && (editMode || permissionsMode)) {
      setUnsavedChangesDialog({
        open: true,
        pendingAction: () => {
          setPermissionsMode(true);
          setEditMode(false);
          setEditData(null);
          if (selectedUser?.permissions) {
            const permissionsCopy = JSON.parse(
              JSON.stringify(selectedUser.permissions),
            );
            setPermissionsData(permissionsCopy);
            setInitialPermissionsData(permissionsCopy);
            setHasPermissionChanges(false);
          }
        },
      });
      return;
    }

    setPermissionsMode(true);
    setEditMode(false);
    setEditData(null);
    if (selectedUser?.permissions) {
      const permissionsCopy = JSON.parse(
        JSON.stringify(selectedUser.permissions),
      );
      setPermissionsData(permissionsCopy);
      setInitialPermissionsData(permissionsCopy);
      setHasPermissionChanges(false);
    }
  };

  const handleCancelPermissions = () => {
    setPermissionsMode(false);
    setPermissionsData(null);
    setInitialPermissionsData(null);
    setHasPermissionChanges(false);
    setHasUnsavedChanges(false);
  };

  const handleTogglePermission = (category: string, permissionId: string) => {
    if (permissionsData && permissionsData[category]) {
      setPermissionsData((prev) => {
        if (!prev) return null;
        const updated = { ...prev };
        updated[category] = updated[category].map((p) =>
          p.id === permissionId ? { ...p, enabled: !p.enabled } : p,
        );
        const hasChanges = !comparePermissions(updated, initialPermissionsData);
        setHasPermissionChanges(hasChanges);
        return updated;
      });
    }
  };

  const handleSavePermissionsClick = () => {
    setConfirmSavePermissions(true);
  };

  const handleConfirmSavePermissions = () => {
    if (selectedUser && permissionsData) {
      const updatedUser = { ...selectedUser, permissions: permissionsData };
      setUserList((prevUsers) =>
        prevUsers.map((u) => (u.id === selectedUser.id ? updatedUser : u)),
      );
      setSelectedUser(updatedUser);
      setInitialPermissionsData(permissionsData);
      setHasPermissionChanges(false);
      setHasUnsavedChanges(false);
      setConfirmSavePermissions(false);
    }
  };

  const handleBlockToggle = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = userList.find((u) => u.id === userId);
    if (user && !user.isBlocked) {
      setConfirmDialog({
        open: true,
        action: "block",
        userId,
      });
    } else {
      setConfirmDialog({
        open: true,
        action: "unblock",
        userId,
      });
    }
  };

  const handleDeleteUser = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      open: true,
      action: "delete",
      userId,
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action === "block" && confirmDialog.userId) {
      setUserList((prevUsers) =>
        prevUsers.map((user) =>
          user.id === confirmDialog.userId
            ? { ...user, isBlocked: true }
            : user,
        ),
      );
      if (selectedUser?.id === confirmDialog.userId) {
        setSelectedUser({ ...selectedUser, isBlocked: true });
      }
    } else if (confirmDialog.action === "unblock" && confirmDialog.userId) {
      setUserList((prevUsers) =>
        prevUsers.map((user) =>
          user.id === confirmDialog.userId
            ? { ...user, isBlocked: false }
            : user,
        ),
      );
      if (selectedUser?.id === confirmDialog.userId) {
        setSelectedUser({ ...selectedUser, isBlocked: false });
      }
    } else if (confirmDialog.action === "delete" && confirmDialog.userId) {
      // Remove the platform-level company association so user-view-slide-panel stays in sync
      removeCompanyLink(confirmDialog.userId, companyId);
      setUserList((prevUsers) =>
        prevUsers.filter((user) => user.id !== confirmDialog.userId),
      );
      if (selectedUser?.id === confirmDialog.userId) {
        setIsDetailsOpen(false);
        setSelectedUser(null);
      }
    }
    setConfirmDialog({ open: false, action: null, userId: null });
  };

  const handleAddUserClick = () => {
    setShowUserCreatePanel(true);
  };

  /** Called by UserCreateSlidePanel when the platform user is created */
  const handlePlatformUserCreated = (platformUser: any) => {
    // 1. Register in platform-level context so admin/usuarios page sees it
    addUser(platformUser);
    // 2. Immediately link user to this company in the context (enables companyContextUsers filter)
    addCompanyLink(platformUser.id, {
      id: 0,
      user_id: platformUser.id,
      company_id: companyId,
      company_name: companyName || String(companyId),
      role: platformUser.role || "company_user",
      permissions: [],
      company_permissions: {} as any,
      project_memberships: [],
      is_active: true,
      joined_at: new Date().toISOString(),
    });
    // 3. Also notify parent if provided
    onUserCreated?.(platformUser);
    // 3. Create a local UserListItem entry linked to the platform user
    const newListItem: UserListItem = {
      id: Math.max(...userList.map((u) => u.id), 0) + 1,
      name: platformUser.name,
      email: platformUser.email,
      avatar: platformUser.name.substring(0, 2).toUpperCase(),
      status: "online",
      profile:
        platformUser.role === "company_admin" ? "Administrador" : "Usuário",
      lastAccess: "Agora",
      createdAt: new Date().toLocaleDateString("pt-BR"),
      isBlocked: false,
      cpf: platformUser.cpf || "",
      phone: platformUser.phone || "",
      address: platformUser.street || "",
      city: platformUser.city || "",
      state: platformUser.state || "",
      zipCode: platformUser.cep || "",
      platformUserId: platformUser.id,
      platform_permissions: platformUser.permissions || [],
      permissions: {
        gestao: [
          { id: "hire_services", name: "Contratar serviços", enabled: false },
          { id: "insert_credit", name: "Inserir crédito", enabled: false },
          {
            id: "approve_payments",
            name: "Aprovar pagamentos",
            enabled: false,
          },
        ],
        tasks: [
          { id: "create_tasks", name: "Criar tarefas", enabled: false },
          { id: "approve_tasks", name: "Aprovar tarefas", enabled: false },
          { id: "edit_tasks", name: "Editar tarefas", enabled: false },
          { id: "delete_tasks", name: "Excluir tarefas", enabled: false },
        ],
        projects: [
          { id: "create_projects", name: "Criar projetos", enabled: false },
          { id: "edit_projects", name: "Editar projetos", enabled: false },
          { id: "delete_projects", name: "Excluir projetos", enabled: false },
        ],
        users: [
          { id: "create_users", name: "Criar usuários", enabled: false },
          { id: "edit_users", name: "Editar usuários", enabled: false },
          { id: "block_users", name: "Bloquear usuários", enabled: false },
        ],
      },
    };
    setUserList((prev) => [newListItem, ...prev]);
  };

  const onlineCount = userList.filter((u) => u.status === "online").length;
  const blockedCount = userList.filter((u) => u.isBlocked).length;

  // Filtrar usuários baseado no termo de pesquisa
  const filteredUsers = userList.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.cpf?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calcular paginação
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Resetar para página 1 ao mudar page size ou termo de pesquisa
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= half + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
      pages.push("...");
    } else if (currentPage >= totalPages - half) {
      pages.push("...");
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++)
        pages.push(i);
    } else {
      pages.push("...");
      for (let i = currentPage - half; i <= currentPage + half; i++)
        pages.push(i);
      pages.push("...");
    }
    return pages;
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-[50px]">
        <div className="pt-[25px] pb-3">
          {/* Stats chips + Adicionar button */}
          <div className="flex items-center justify-between">
            {/* Left: compact stat chips */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-sm font-bold text-blue-600">
                  {userList.length}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-600">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>
                <span className="text-xs text-slate-500">Online</span>
                <span className="text-sm font-bold text-green-600">
                  {onlineCount}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500">
                  <Lock className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs text-slate-500">Bloqueados</span>
                <span className="text-sm font-bold text-red-600">
                  {blockedCount}
                </span>
              </div>
            </div>
            {/* Right: Add user button */}
            <Button
              onClick={handleAddUserClick}
              size="sm"
              className="h-9 gap-2 px-4 text-sm btn-brand border-0 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar usuário
            </Button>
          </div>
        </div>

        {/* Global-standard Table Card */}
        <div className="mx-0 mb-5 border border-slate-200/70 rounded-lg overflow-hidden shadow-sm bg-white">
          {/* Top Bar — matches empresas page */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 bg-white">
            {/* Search */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-sm bg-white border-slate-200 rounded-lg focus-visible:ring-blue-500 w-full"
              />
            </div>

            {/* Items per page + count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => {
                  handlePageSizeChange(Number(value));
                }}
                variant="top"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {filteredUsers.length !== userList.length ? (
                  <>
                    de{" "}
                    <span className="font-semibold text-blue-500">
                      {filteredUsers.length}
                    </span>{" "}
                    de {userList.length} usuário
                    {userList.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  <>
                    de{" "}
                    <span className="font-semibold text-slate-600">
                      {userList.length}
                    </span>{" "}
                    usuário{userList.length !== 1 ? "s" : ""}
                  </>
                )}
              </span>
            </div>

            {/* Column config */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                  title="Configurar colunas"
                >
                  <Cog className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[220px] p-0"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">
                    Colunas visíveis
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Selecione quais colunas exibir na tabela
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  {USER_COLS.map((col) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        visibleCols.has(col.key)
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                      } ${col.required ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <Checkbox
                        checked={visibleCols.has(col.key)}
                        onCheckedChange={() =>
                          !col.required && toggleUserCol(col.key)
                        }
                        disabled={col.required}
                        className="h-4 w-4"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {col.label}
                      </span>
                      {col.required && (
                        <span className="text-[9px] text-slate-400 ml-auto">
                          obrigatória
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setVisibleCols(new Set(USER_COLS.map((c) => c.key)))
                    }
                    className="text-[10px] font-medium text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Mostrar todas
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {visibleCols.size} de {USER_COLS.length}
                  </span>
                </div>
              </PopoverContent>
            </Popover>

            {/* Pagination */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
                    onClick={() => handlePageClick(Number(page))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      page === currentPage
                        ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table
              className="text-sm"
              style={{ tableLayout: "fixed", width: "100%" }}
            >
              <colgroup>
                {visibleCols.has("usuario") && (
                  <col style={{ width: colWidths.usuario }} />
                )}
                {visibleCols.has("email") && (
                  <col style={{ width: colWidths.email }} />
                )}
                {visibleCols.has("status") && (
                  <col style={{ width: colWidths.status }} />
                )}
                {visibleCols.has("perfil") && (
                  <col style={{ width: colWidths.perfil }} />
                )}
                {visibleCols.has("acoes") && (
                  <col style={{ width: colWidths.acoes }} />
                )}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200/60">
                  {visibleCols.has("usuario") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      Usuário
                      <div
                        onMouseDown={(e) => handleResizeStart("usuario", e)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                      />
                    </th>
                  )}
                  {visibleCols.has("email") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      E-mail
                      <div
                        onMouseDown={(e) => handleResizeStart("email", e)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                      />
                    </th>
                  )}
                  {visibleCols.has("status") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      Status
                      <div
                        onMouseDown={(e) => handleResizeStart("status", e)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                      />
                    </th>
                  )}
                  {visibleCols.has("perfil") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      Perfil · Último acesso
                      <div
                        onMouseDown={(e) => handleResizeStart("perfil", e)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
                      />
                    </th>
                  )}
                  {visibleCols.has("acoes") && (
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white"
                      style={{
                        position: "sticky",
                        right: 0,
                        zIndex: 2,
                        borderLeft: "1px solid rgba(148,163,184,0.25)",
                      }}
                    >
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, rowIndex) => (
                    <tr
                      key={user.id}
                      className={`group transition-colors cursor-pointer ${rowIndex % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-200/50 hover:bg-slate-200/70"}`}
                    >
                      {visibleCols.has("usuario") && (
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`}
                                />
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                                  {user.avatar}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${user.status === "online" ? "bg-green-500" : "bg-slate-300"}`}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-slate-900">
                                {user.name}
                              </p>
                              {user.isBlocked && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] px-1.5 py-0 h-4 mt-0.5"
                                >
                                  Bloqueado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleCols.has("email") && (
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 truncate max-w-[160px]">
                              {user.email}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleCols.has("status") && (
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.isBlocked
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : user.status === "online"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {user.isBlocked ? (
                              <Lock className="h-3 w-3" />
                            ) : user.status === "online" ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <PauseCircle className="h-3 w-3" />
                            )}
                            {user.isBlocked
                              ? "Bloqueado"
                              : user.status === "online"
                                ? "Online"
                                : "Offline"}
                          </span>
                        </td>
                      )}
                      {visibleCols.has("perfil") && (
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                user.profile === "Administrador"
                                  ? "bg-violet-50 text-violet-700 border-violet-200"
                                  : user.profile === "Gerente"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {user.profile}
                            </span>
                            <p className="text-xs text-slate-400 pl-0.5">
                              {user.lastAccess}
                            </p>
                          </div>
                        </td>
                      )}
                      {visibleCols.has("acoes") && (
                        <td
                          className="px-4 py-3.5"
                          style={{
                            position: "sticky",
                            right: 0,
                            zIndex: 1,
                            background:
                              rowIndex % 2 === 0 ? "#ffffff" : "#f1f4f8",
                            borderLeft: "1px solid rgba(148,163,184,0.25)",
                          }}
                        >
                          <div className="flex items-center justify-end gap-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleViewDetails(user)}
                                >
                                  <Eye className="h-2.5 w-2.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Ver detalhes
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-5 w-5 p-0 rounded ${
                                    user.isBlocked
                                      ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                      : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                  }`}
                                  onClick={(e) => handleBlockToggle(user.id, e)}
                                >
                                  {user.isBlocked ? (
                                    <Unlock className="h-2.5 w-2.5" />
                                  ) : (
                                    <Lock className="h-2.5 w-2.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {user.isBlocked ? "Desbloquear" : "Bloquear"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => handleDeleteUser(user.id, e)}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Excluir
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={visibleCols.size}
                      className="py-16 text-center"
                    >
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Shield className="h-6 w-6 opacity-40" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {searchTerm
                            ? "Nenhum usuário encontrado"
                            : "Nenhum usuário cadastrado"}
                        </p>
                        {searchTerm && (
                          <p className="text-xs text-slate-400">
                            Tente ajustar o termo de busca
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination — matches empresas page */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40">
              <div className="flex items-center gap-2">
                <ItemsPerPageSelect
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    handlePageSizeChange(Number(value));
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
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
                      onClick={() => handlePageClick(Number(page))}
                      className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        page === currentPage
                          ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Panel — full-width sidebar-aware */}
      {(isDetailsOpen || isDetailsClosing) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            data-state={isDetailsClosing ? "closed" : "open"}
            style={{
              animation: isDetailsClosing
                ? "fadeOut 0.4s ease forwards"
                : "fadeIn 0.2s ease forwards",
            }}
            onClick={() => {
              if (
                !detailShowAvatarMenu &&
                !(cropOpen && cropContext === "detail")
              ) {
                handleCloseDetails();
              }
            }}
          />
          {/* Panel */}
          <div
            data-slot="sheet-content"
            data-state={isDetailsClosing ? "closed" : "open"}
            className="fixed top-0 z-50 h-screen bg-white flex flex-col shadow-2xl border-l border-slate-200 overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
            style={{
              left:
                typeof sidebarWidth === "number"
                  ? `${sidebarWidth}px`
                  : `${parseInt(String(sidebarWidth)) || 240}px`,
              width: `calc(100vw - ${typeof sidebarWidth === "number" ? sidebarWidth : parseInt(String(sidebarWidth)) || 240}px)`,
            }}
          >
            {selectedUser && (
              <div className="relative h-full flex flex-col bg-white">
                {/* hidden detail file input */}
                <input
                  ref={detailFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleDetailFileChange}
                />

                {/* Gradient Header — full-width premium */}
                <header
                  className="app-brand-header relative flex items-center gap-4 pl-8 pr-14 flex-shrink-0 overflow-hidden"
                  style={{ minHeight: 100 }}
                >
                  {/* Close button */}
                  <button
                    onClick={handleCloseDetails}
                    className="absolute top-4 right-4 z-10 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                    title="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  {/* Clickable avatar — same as add-user panel */}
                  <button
                    onClick={handleDetailAvatarClick}
                    className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 shadow-lg group overflow-hidden hover:border-white/60 transition-all"
                  >
                    {/* fallback initials */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                      <span className="text-white text-xl font-bold">
                        {selectedUser.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    {/* dicebear or uploaded photo */}
                    {detailAvatarPreview[selectedUser.id] ? (
                      <img
                        src={detailAvatarPreview[selectedUser.id]}
                        alt="avatar"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.avatar}`}
                        alt={selectedUser.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {/* Camera hover overlay */}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="h-5 w-5 text-white" />
                      <span className="text-[9px] text-white/90 font-medium mt-0.5">
                        {detailAvatarPreview[selectedUser.id]
                          ? "Editar"
                          : "Foto"}
                      </span>
                    </div>
                  </button>

                  {/* Name / email / status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">
                      Perfil do usuário
                    </p>
                    <h2 className="text-lg font-bold text-white leading-tight truncate">
                      {selectedUser.name}
                    </h2>
                    <p className="text-xs text-white/60 truncate mt-0.5">
                      {selectedUser.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${selectedUser.status === "online" ? "bg-green-400" : "bg-gray-400"}`}
                      />
                      <span className="text-[10px] font-medium text-white/70">
                        {selectedUser.status === "online"
                          ? "Online"
                          : "Offline"}
                      </span>
                    </div>
                  </div>
                  {/* Action icon buttons — absolute bottom-right */}
                  <div className="absolute bottom-3 right-5 flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleEditUser}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-white/80" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleOpenPermissions}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5 text-white/80" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Permissões</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) =>
                            handleBlockToggle(
                              selectedUser.id,
                              e as React.MouseEvent<HTMLButtonElement>,
                            )
                          }
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                        >
                          {selectedUser.isBlocked ? (
                            <Unlock className="h-3.5 w-3.5 text-white/80" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-white/80" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {selectedUser.isBlocked ? "Desbloquear" : "Bloquear"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) =>
                            handleDeleteUser(
                              selectedUser.id,
                              e as React.MouseEvent<HTMLButtonElement>,
                            )
                          }
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-300" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  </div>
                </header>

                {/* Detail avatar context menu */}
                {detailShowAvatarMenu &&
                  selectedUser &&
                  (detailAvatarPreview[selectedUser.id] ||
                    selectedUser.avatar) && (
                    <>
                      <div
                        className="absolute inset-0 z-40"
                        onClick={() => setDetailShowAvatarMenu(false)}
                      />
                      <div
                        className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]"
                        style={{ top: 108, left: 24 }}
                      >
                        <button
                          onClick={() => {
                            setDetailShowAvatarMenu(false);
                            setTimeout(
                              () => detailFileInputRef.current?.click(),
                              10,
                            );
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5 text-gray-400" />
                          Nova foto
                        </button>
                        {detailOriginalRawSrc && (
                          <button
                            onClick={() => {
                              setDetailShowAvatarMenu(false);
                              setRawImageSrc(detailOriginalRawSrc);
                              setCropZoom(1);
                              setCropOffset({ x: 0, y: 0 });
                              setCropContext("detail");
                              setCropOpen(true);
                            }}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                          >
                            <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                            Reposicionar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDetailShowAvatarMenu(false);
                            if (selectedUser)
                              setDetailAvatarPreview((prev) => {
                                const n = { ...prev };
                                delete n[selectedUser.id];
                                return n;
                              });
                            setDetailOriginalRawSrc(null);
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover foto
                        </button>
                      </div>
                    </>
                  )}

                {/* Detail crop overlay */}
                {cropOpen && rawImageSrc && cropContext === "detail" && (
                  <div className="absolute inset-0 z-50 flex flex-col bg-black/90">
                    <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                      <p className="text-white text-sm font-semibold">
                        Ajustar foto de perfil
                      </p>
                      <p className="text-white/50 text-xs mt-0.5">
                        Arraste para reposicionar · Use o zoom para ajustar
                      </p>
                    </div>
                    <div
                      className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
                      onMouseDown={handleCropMouseDown}
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                      onMouseLeave={handleCropMouseUp}
                    >
                      <img
                        src={rawImageSrc}
                        alt=""
                        draggable={false}
                        className="absolute pointer-events-none select-none opacity-25"
                        style={{
                          maxWidth: "none",
                          transform: `scale(${cropZoom})`,
                          transformOrigin: "center",
                          left: `calc(50% + ${cropOffset.x}px)`,
                          top: `calc(50% + ${cropOffset.y}px)`,
                          translate: "-50% -50%",
                        }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle ${CROP_SIZE / 2}px at 50% 50%, transparent ${CROP_SIZE / 2}px, rgba(0,0,0,0.72) ${CROP_SIZE / 2}px)`,
                        }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`,
                        }}
                      >
                        <img
                          ref={cropImgRef}
                          src={rawImageSrc}
                          alt="crop"
                          draggable={false}
                          className="absolute select-none"
                          style={{
                            maxWidth: "none",
                            transform: `scale(${cropZoom})`,
                            transformOrigin: "center",
                            left: `calc(50% + ${cropOffset.x}px)`,
                            top: `calc(50% + ${cropOffset.y}px)`,
                            translate: "-50% -50%",
                          }}
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
                            backgroundSize: "33.3% 33.3%",
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="rounded-full border-2 border-white/70 shadow-2xl"
                          style={{ width: CROP_SIZE, height: CROP_SIZE }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 px-8 py-4 flex items-center gap-3">
                      <span className="text-white/40 text-xs w-8 text-right">
                        {Math.round(cropZoom * 100)}%
                      </span>
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.02"
                        value={cropZoom}
                        onChange={(e) => setCropZoom(Number(e.target.value))}
                        className="flex-1 accent-white cursor-pointer"
                      />
                      <ZoomIn className="h-4 w-4 text-white/50 flex-shrink-0" />
                      <button
                        onClick={() => setCropOffset({ x: 0, y: 0 })}
                        title="Centralizar"
                        className="flex-shrink-0 h-7 w-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
                      >
                        <Crosshair className="h-3.5 w-3.5 text-white/70" />
                      </button>
                    </div>
                    <div className="flex-shrink-0 flex gap-3 px-8 pb-6">
                      <button
                        onClick={() => {
                          setCropOpen(false);
                          setRawImageSrc(null);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCropConfirm}
                        className="flex-1 py-2.5 rounded-xl btn-brand text-sm font-semibold shadow-md transition-all"
                      >
                        Usar esta foto
                      </button>
                    </div>
                  </div>
                )}

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/40">
                  {!permissionsMode ? (
                    <div className="px-8 py-6 space-y-5 max-w-4xl">
                      {/* Section: Dados da Conta */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center">
                            <Shield className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                            Dados da Conta
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              ID
                            </p>
                            <p className="text-sm font-bold text-slate-800 mt-1 font-mono">
                              #{selectedUser.id}
                            </p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Perfil
                            </p>
                            <p className="text-sm font-bold text-slate-800 mt-1">
                              {selectedUser.profile}
                            </p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Status
                            </p>
                            <span
                              className={`inline-flex items-center mt-1 gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${selectedUser.isBlocked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${selectedUser.isBlocked ? "bg-red-500" : "bg-emerald-500"}`}
                              />
                              {selectedUser.isBlocked ? "Bloqueado" : "Ativo"}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Último acesso
                            </p>
                            <p className="text-sm font-bold text-slate-800 mt-1">
                              {selectedUser.lastAccess}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section: Identificação */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                            Identificação
                          </span>
                        </div>
                        {!editMode ? (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              {
                                label: "Nome completo",
                                value: selectedUser.name,
                              },
                              {
                                label: "CPF",
                                value: selectedUser.cpf || "Não informado",
                              },
                              {
                                label: "Telefone",
                                value: selectedUser.phone || "Não informado",
                              },
                              { label: "E-mail", value: selectedUser.email },
                            ].map(({ label, value }) => (
                              <div
                                key={label}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
                              >
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                  {label}
                                </p>
                                <p className="text-sm font-medium text-slate-800 mt-1 break-all">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                Nome completo
                              </label>
                              <Input
                                value={editData?.name || ""}
                                onChange={(e) =>
                                  handleEditFieldChange("name", e.target.value)
                                }
                                placeholder="Nome completo"
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                  Telefone
                                </label>
                                <Input
                                  value={editData?.phone || ""}
                                  onChange={(e) =>
                                    handleEditFieldChange(
                                      "phone",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="(11) 98765-4321"
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                  E-mail
                                </label>
                                <Input
                                  value={editData?.email || ""}
                                  onChange={(e) =>
                                    handleEditFieldChange(
                                      "email",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="email@exemplo.com"
                                  type="email"
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section: Endereço */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-5 w-5 rounded-md bg-violet-100 flex items-center justify-center">
                            <MapPin className="h-3 w-3 text-violet-600" />
                          </div>
                          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">
                            Endereço
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            (opcional)
                          </span>
                        </div>
                        {!editMode ? (
                          <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                Logradouro
                              </p>
                              <p className="text-xs font-medium text-slate-800 mt-0.5">
                                {selectedUser.address || "Não informado"}
                              </p>
                            </div>
                            <div className="col-span-1 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                UF
                              </p>
                              <p className="text-sm font-medium text-slate-800 mt-1">
                                {selectedUser.state || "—"}
                              </p>
                            </div>
                            <div className="col-span-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                Cidade
                              </p>
                              <p className="text-sm font-medium text-slate-800 mt-1">
                                {selectedUser.city || "Não informado"}
                              </p>
                            </div>
                            <div className="col-span-1 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                CEP
                              </p>
                              <p className="text-sm font-medium text-slate-800 mt-1">
                                {selectedUser.zipCode || "Não informado"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                Logradouro
                              </label>
                              <Input
                                value={editData?.address || ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    "address",
                                    e.target.value,
                                  )
                                }
                                placeholder="Rua, Avenida, Nº..."
                                className="mt-1 h-8 text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                  Cidade
                                </label>
                                <Input
                                  value={editData?.city || ""}
                                  onChange={(e) =>
                                    handleEditFieldChange(
                                      "city",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="São Paulo"
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                  UF
                                </label>
                                <Input
                                  value={editData?.state || ""}
                                  onChange={(e) =>
                                    handleEditFieldChange(
                                      "state",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="SP"
                                  maxLength={2}
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                  CEP
                                </label>
                                <Input
                                  value={editData?.zipCode || ""}
                                  onChange={(e) =>
                                    handleEditFieldChange(
                                      "zipCode",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="01234-567"
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section: Uso e Métricas */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-5 w-5 rounded-md bg-amber-100 flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-amber-600" />
                          </div>
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
                            Uso e Métricas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Tempo online
                            </p>
                            <p className="text-xl font-bold text-amber-600 mt-1">
                              {selectedUser.averageOnlineHours || 2.5}h
                              <span className="text-sm font-medium text-slate-500">
                                /dia
                              </span>
                            </p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Sem acesso
                            </p>
                            <p className="text-xl font-bold text-orange-600 mt-1">
                              {selectedUser.averageOfflineDays || 1}
                              <span className="text-sm font-medium text-slate-500">
                                {" "}
                                dias
                              </span>
                            </p>
                          </div>
                        </div>
                        {/* Chart */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-slate-500 mb-3">
                            Tempo online — últimos 7 dias
                          </p>
                          <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={timelineData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#e5e7eb"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="day"
                                  tick={{ fontSize: 9 }}
                                  stroke="#9CA3AF"
                                />
                                <YAxis
                                  tick={{ fontSize: 9 }}
                                  stroke="#9CA3AF"
                                  tickFormatter={(v) => `${v}h`}
                                />
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: "#1F2937",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: 10,
                                  }}
                                  formatter={(v: number) => [`${v}h`, "Online"]}
                                />
                                <Bar
                                  dataKey="hours"
                                  radius={[4, 4, 0, 0]}
                                  fill="#3B82F6"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Permissions Mode */
                    <div className="px-8 py-6 space-y-4 max-w-4xl">
                      {/* === BLOCK A: Company permissions (editable by company admin) === */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center">
                          <Shield className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                          Permissões na Empresa
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 -mt-2">
                        Gerenciadas pelo administrador da empresa.
                      </p>
                      {permissionsData &&
                        Object.entries(permissionsData).map(
                          ([categoryKey, categoryData]) => (
                            <div
                              key={categoryKey}
                              className="border border-slate-100 rounded-xl overflow-hidden"
                            >
                              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                  {categoryKey === "gestao"
                                    ? "Gestão"
                                    : categoryKey === "tasks"
                                      ? "Tarefas"
                                      : categoryKey === "projects"
                                        ? "Projetos"
                                        : "Usuários"}
                                </p>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {categoryData.map((permission) => (
                                  <div
                                    key={permission.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="text-sm text-slate-800">
                                      {permission.name}
                                    </span>
                                    <Switch
                                      checked={permission.enabled}
                                      onCheckedChange={() =>
                                        handleTogglePermission(
                                          categoryKey,
                                          permission.id,
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        )}

                      {/* === BLOCK B: Platform permissions (read-only — managed by platform admin) === */}
                      <div className="mt-6 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded-md bg-slate-200 flex items-center justify-center">
                            <Lock className="h-3 w-3 text-slate-500" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Permissões na Plataforma
                          </span>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 mb-3">
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                            Gerenciadas exclusivamente pelo administrador da
                            plataforma.
                          </p>
                        </div>
                        {selectedUser?.platform_permissions &&
                        selectedUser.platform_permissions.length > 0 ? (
                          <div className="border border-slate-100 rounded-xl overflow-hidden opacity-70">
                            <div className="divide-y divide-slate-100">
                              {selectedUser.platform_permissions.map((perm) => (
                                <div
                                  key={perm}
                                  className="flex items-center justify-between px-4 py-2.5 bg-white"
                                >
                                  <span className="text-xs text-slate-600">
                                    {perm
                                      .replace(/_/g, " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle className="h-2.5 w-2.5" />{" "}
                                    Ativo
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-3">
                            Nenhuma permissão de plataforma atribuída.
                          </p>
                        )}
                      </div>

                      {/* === BLOCK C: Project permissions (per-project, managed by company admin) === */}
                      {(() => {
                        const platformUser = selectedUser?.platformUserId
                          ? getUserById(selectedUser.platformUserId)
                          : null;
                        const assoc = platformUser?.company_associations?.find(
                          (a) => a.company_id === companyId,
                        );
                        const memberships = assoc?.project_memberships || [];
                        const availableProjects = (
                          MOCK_COMPANY_PROJECTS[companyId] || []
                        ).filter(
                          (p) =>
                            !memberships.some((m) => m.project_id === p.id),
                        );
                        return (
                          <div className="mt-6 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-md bg-violet-100 flex items-center justify-center">
                                  <Cog className="h-3 w-3 text-violet-600" />
                                </div>
                                <span className="text-[11px] font-bold text-violet-600 uppercase tracking-widest">
                                  Permissões por Projeto
                                </span>
                              </div>
                              {availableProjects.length > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                    >
                                      <Plus className="h-3 w-3" /> Vincular
                                      projeto
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-64 p-2"
                                    align="end"
                                  >
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1 mb-1">
                                      Projetos disponíveis
                                    </p>
                                    {availableProjects.map((proj) => (
                                      <button
                                        key={proj.id}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700 flex items-center justify-between group"
                                        onClick={() => {
                                          if (selectedUser?.platformUserId) {
                                            upsertProjectMembership(
                                              selectedUser.platformUserId,
                                              companyId,
                                              {
                                                project_id: proj.id,
                                                project_name: proj.name,
                                                permissions: ["view"],
                                              },
                                            );
                                          }
                                        }}
                                      >
                                        <span>{proj.name}</span>
                                        <Plus className="h-3.5 w-3.5 text-violet-500 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 -mt-1 mb-3">
                              Defina o que este usuário pode fazer em cada
                              projeto.
                            </p>
                            {memberships.length === 0 ? (
                              <div className="flex flex-col items-center py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <Cog className="h-7 w-7 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-400">
                                  Nenhum projeto vinculado ainda.
                                </p>
                                {availableProjects.length > 0 && (
                                  <p className="text-[11px] text-violet-400 mt-1">
                                    Clique em "Vincular projeto" para adicionar.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {memberships.map((membership) => (
                                  <div
                                    key={membership.project_id}
                                    className="border border-slate-200 rounded-xl overflow-hidden"
                                  >
                                    <div className="px-4 py-2.5 bg-violet-50/60 border-b border-slate-200 flex items-center justify-between">
                                      <p className="text-xs font-bold text-slate-700">
                                        {membership.project_name}
                                      </p>
                                      <button
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        onClick={() => {
                                          if (selectedUser?.platformUserId) {
                                            removeProjectMembership(
                                              selectedUser.platformUserId,
                                              companyId,
                                              membership.project_id,
                                            );
                                          }
                                        }}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {ALL_PROJECT_PERMISSIONS.map((perm) => (
                                        <div
                                          key={perm.id}
                                          className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                                        >
                                          <div>
                                            <p className="text-xs font-medium text-slate-700">
                                              {perm.label}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                              {perm.description}
                                            </p>
                                          </div>
                                          <Switch
                                            checked={membership.permissions.includes(
                                              perm.id,
                                            )}
                                            onCheckedChange={(checked) => {
                                              if (!selectedUser?.platformUserId)
                                                return;
                                              const newPerms = checked
                                                ? [
                                                    ...membership.permissions.filter(
                                                      (p) => p !== perm.id,
                                                    ),
                                                    perm.id,
                                                  ]
                                                : membership.permissions.filter(
                                                    (p) => p !== perm.id,
                                                  );
                                              upsertProjectMembership(
                                                selectedUser.platformUserId,
                                                companyId,
                                                {
                                                  ...membership,
                                                  permissions: newPerms,
                                                },
                                              );
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Edit footer */}
                {editMode && (
                  <div className="flex-shrink-0 border-t border-slate-200 px-8 py-4 bg-white flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="h-10 px-6"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveClick}
                      className="h-10 px-6 btn-brand border-0"
                    >
                      Salvar alterações
                    </Button>
                  </div>
                )}

                {/* Permissions footer */}
                {permissionsMode && hasPermissionChanges && (
                  <div className="flex-shrink-0 border-t border-slate-200 px-8 py-4 bg-white flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelPermissions}
                      className="h-10 px-6"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSavePermissionsClick}
                      className="h-10 px-6 btn-brand border-0"
                    >
                      Salvar permissões
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onClose={() =>
          setConfirmDialog({ open: false, action: null, userId: null })
        }
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.action === "block"
            ? "Bloquear Usuário"
            : confirmDialog.action === "unblock"
              ? "Desbloquear Usuário"
              : "Deletar Usuário"
        }
        message={
          confirmDialog.action === "block"
            ? `Tem certeza que deseja bloquear o usuário "${selectedUser?.name}"? Ele não poderá acessar até ser desbloqueado.`
            : confirmDialog.action === "unblock"
              ? `Tem certeza que deseja desbloquear o usuário "${selectedUser?.name}"?`
              : `Tem certeza que deseja deletar o usuário "${selectedUser?.name}"? Esta ação é irreversível.`
        }
        confirmText={
          confirmDialog.action === "block"
            ? "Bloquear"
            : confirmDialog.action === "unblock"
              ? "Desbloquear"
              : "Deletar"
        }
        cancelText="Cancelar"
        destructive={confirmDialog.action === "delete"}
      />

      {/* Save Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleConfirmSave}
        title="Confirmar Alterações"
        message="Tem certeza que deseja salvar as alterações deste usuário?"
        confirmText="Confirmar"
        cancelText="Cancelar"
        destructive={false}
      />

      {/* Save Permissions Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmSavePermissions}
        onClose={() => setConfirmSavePermissions(false)}
        onConfirm={handleConfirmSavePermissions}
        title="Confirmar Alterações de Permissões"
        message="Tem certeza que deseja atualizar as permissões deste usuário?"
        confirmText="Confirmar"
        cancelText="Cancelar"
        destructive={false}
      />

      {/* Unsaved Changes Warning Dialog */}
      <ConfirmationDialog
        open={unsavedChangesDialog.open}
        onClose={() =>
          setUnsavedChangesDialog({ open: false, pendingAction: null })
        }
        onConfirm={() => {
          setUnsavedChangesDialog({ open: false, pendingAction: null });
          setEditMode(false);
          setEditData(null);
          setPermissionsMode(false);
          setPermissionsData(null);
          setInitialPermissionsData(null);
          setHasPermissionChanges(false);
          setHasUnsavedChanges(false);
          unsavedChangesDialog.pendingAction?.();
        }}
        title="Alterações Não Salvas"
        message="Existem alterações não salvas. Para mudar de tela, você deve salvar ou cancelar as alterações."
        confirmText="Cancelar alterações"
        cancelText="Voltar"
        destructive={false}
      />

      {/* User Create Panel — opens full-width slide panel for platform user creation */}
      <UserCreateSlidePanel
        open={showUserCreatePanel}
        onClose={() => setShowUserCreatePanel(false)}
        onUserCreated={handlePlatformUserCreated}
        companyId={companyId}
        companyName={companyName}
      />
    </>
  );
}
