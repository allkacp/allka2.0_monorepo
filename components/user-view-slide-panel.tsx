// @ts-nocheck
import { cn } from "@/lib/utils";
import { TooltipContent } from "@/components/ui/tooltip";

import { TooltipTrigger } from "@/components/ui/tooltip";

import { Tooltip } from "@/components/ui/tooltip";

import { TooltipProvider } from "@/components/ui/tooltip";

import React from "react";

import {
  X,
  Mail,
  Phone,
  Building2,
  Shield,
  UserIcon,
  Lock,
  CheckCircle,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  Clock,
  Zap,
  Search,
  Edit2,
  Save,
  XCircle,
  Loader2,
  Download,
  Copy,
  Eye,
  EyeOff,
  Send,
  Key,
  ChevronDown,
  CreditCard,
  Plus,
  Trash2,
  Wallet,
  FileText,
  Check,
  DollarSign,
  BarChart3,
  Settings,
  Smartphone,
  Globe,
  Monitor,
  Tablet,
  Star,
  Upload,
  ToggleRight,
  ToggleLeft,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { UserViewHeader } from "@/components/user-view-header";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { User as UserType } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import {
  usePlatformUsers,
  MOCK_COMPANIES,
} from "@/contexts/platform-users-context";
import { apiClient } from "@/lib/api-client";
import {
  ALL_PROJECT_PERMISSIONS,
  MOCK_COMPANY_PROJECTS,
  DEFAULT_COMPANY_PERMISSIONS,
  ADMIN_COMPANY_PERMISSIONS,
} from "@/types/user";

const USER_DADOS_ALL_ACCORDIONS = [
  "dados-principais",
  "status-conta",
  "nivel-performance",
  "pessoais",
  "contato",
  "endereco",
  "adicionais",
];

interface UserViewSlidePanelProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  user: UserType | null;
}

// Dados fake
const createFakeUserData = (user: UserType | null): UserType => {
  return {
    id: "usr_2024001",
    name: "João Silva Santos",
    email: "joao.silva@example.com",
    phone: "(11) 98765-4321",
    cpf: "123.456.789-00",
    cnpj: "12.345.678/0001-90",
    birth_date: "1990-05-15",
    created_at: "2024-01-10",
    last_login: "2024-01-28T14:30:00",
    is_active: true,
    role: "admin",
    account_type: "premium",
    street: "Rua das Flores",
    number: "123",
    complement: "Apto 45",
    city: "São Paulo",
    state: "SP",
    zip_code: "01310-100",
    country: "Brasil",
    job_title: "Gerente de Projetos",
    department: "Desenvolvimento",
    // Dados Financeiros
    bank_name: "Banco do Brasil",
    agency_number: "1234",
    account_number: "123456-7",
    card_last_digits: "1234",
    card_holder: "JOAO SILVA SANTOS",
    card_expiry: "12/26",
    pix_key: "joao.silva@example.com",
    wallet_balance: 2500.75,
    wallet_status: "ativa",
    financial_document: "123.456.789-00",
    financial_holder: "João Silva Santos",
    person_type: "fisica",
    tax_regime: "simples",
    financial_notes: "",
    permissions: [
      "manage_users",
      "manage_permissions",
      "view_financial",
      "edit_financial",
      "adjust_balance",
      "manage_cards",
      "manage_accounts",
      "create_tasks",
      "edit_tasks",
      "delete_tasks",
      "assign_tasks",
      "approve_tasks",
      "view_reports",
      "export_reports",
      "view_metrics",
      "access_settings",
      "manage_integrations",
      "view_logs",
    ],
    online_status: "online",
    ...(user || {}),
  } as UserType;
};

const accessChartData = [
  { date: "1", acessos: 45 },
  { date: "5", acessos: 52 },
  { date: "10", acessos: 38 },
  { date: "15", acessos: 61 },
  { date: "20", acessos: 55 },
  { date: "25", acessos: 68 },
  { date: "30", acessos: 72 },
];

const moduleUsageData = [
  { nome: "Vendas", uso: 85 },
  { nome: "Relatórios", uso: 65 },
  { nome: "Financeiro", uso: 72 },
  { nome: "RH", uso: 48 },
  { nome: "Operações", uso: 90 },
];

const permissionsByCategory = {
  Usuários: [
    { id: "user_create", name: "Criar Usuários", risk: "alto" },
    { id: "user_edit", name: "Editar Usuários", risk: "médio" },
    { id: "user_delete", name: "Deletar Usuários", risk: "crítico" },
    { id: "user_view", name: "Visualizar Usuários", risk: "baixo" },
  ],
  Financeiro: [
    { id: "fin_view", name: "Visualizar Financeiro", risk: "médio" },
    { id: "fin_edit", name: "Editar Financeiro", risk: "alto" },
    { id: "fin_approve", name: "Aprovar Transações", risk: "crítico" },
    { id: "fin_report", name: "Relatórios Financeiros", risk: "médio" },
  ],
  Relatórios: [
    { id: "report_view", name: "Visualizar Relatórios", risk: "baixo" },
    { id: "report_create", name: "Criar Relatórios", risk: "médio" },
    { id: "report_export", name: "Exportar Relatórios", risk: "médio" },
    { id: "report_schedule", name: "Agendar Relatórios", risk: "médio" },
  ],
  Configurações: [
    { id: "settings_view", name: "Visualizar Configurações", risk: "baixo" },
    { id: "settings_edit", name: "Editar Configurações", risk: "alto" },
    {
      id: "settings_system",
      name: "Configurações de Sistema",
      risk: "crítico",
    },
  ],
  Integrações: [
    { id: "integ_view", name: "Visualizar Integrações", risk: "baixo" },
    { id: "integ_connect", name: "Conectar Integrações", risk: "alto" },
    { id: "integ_manage", name: "Gerenciar Integrações", risk: "crítico" },
  ],
};

const templates = [
  {
    name: "Admin Completo",
    permissions: Object.values(permissionsByCategory)
      .flat()
      .map((p) => p.id),
  },
  {
    name: "Financeiro",
    permissions: permissionsByCategory["Financeiro"].map((p) => p.id),
  },
  {
    name: "Relatórios",
    permissions: permissionsByCategory["Relatórios"].map((p) => p.id),
  },
  {
    name: "Leitura Apenas",
    permissions: [
      "user_view",
      "fin_view",
      "report_view",
      "settings_view",
      "integ_view",
    ],
  },
];

export function UserViewSlidePanel({
  open,
  onClose,
  onRefresh,
  user,
}: UserViewSlidePanelProps) {
  const {
    getUserById,
    addCompanyLink,
    removeCompanyLink,
    updateCompanyLink,
    upsertProjectMembership,
    removeProjectMembership,
    updateUser,
  } = usePlatformUsers();
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isClosing) setIsMounted(false);
  }, [open, isClosing]);
  const [onlineStatus, setOnlineStatus] = useState("online");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<UserType>>({});
  const [isContaEditMode, setIsContaEditMode] = useState(false);
  const [contaEditedData, setContaEditedData] = useState<Partial<UserType>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchPermissions, setSearchPermissions] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(
    null,
  );
  const [resetPasswordUrl, setResetPasswordUrl] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    "dados-principais",
    "estatisticas-user",
    "info-principais",
  ]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelEditConfirm, setShowCancelEditConfirm] = useState(false);
  const [pendingCancelCallback, setPendingCancelCallback] = useState<
    (() => void) | null
  >(null);
  const [persistedUserData, setPersistedUserData] =
    useState<Partial<UserType> | null>(null);
  const [isDadosEditMode, setIsDadosEditMode] = useState(false);
  const [dadosEditedData, setDadosEditedData] = useState<Partial<UserType>>({});
  const [showDadosConfirmDialog, setShowDadosConfirmDialog] = useState(false);
  const [isFinancialEditMode, setIsFinancialEditMode] = useState(false);
  const [financialEditedData, setFinancialEditedData] = useState<
    Partial<UserType>
  >({});
  const [showFinancialConfirmDialog, setShowFinancialConfirmDialog] =
    useState(false);
  const [financialOpenAccordions, setFinancialOpenAccordions] = useState<
    string[]
  >(["pagamentos"]);
  const [dadosOpenAccordions, setDadosOpenAccordions] = useState<string[]>([
    "pessoais",
  ]);
  const [securityOpenAccordions, setSecurityOpenAccordions] = useState<
    string[]
  >(["auth"]);
  const [contaSingleOpen, setContaSingleOpen] = useState(false);
  const [dadosSingleOpen, setDadosSingleOpen] = useState(false);
  const [financialSingleOpen, setFinancialSingleOpen] = useState(false);
  const [permissionsSingleOpen, setPermissionsSingleOpen] = useState(false);
  const [securitySingleOpen, setSecuritySingleOpen] = useState(false);
  // Card Management
  const [cards, setCards] = useState<
    Array<{
      id: string;
      lastDigits: string;
      holder: string;
      expiry: string;
      brand: string;
      isDefault: boolean;
    }>
  >([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardFormData, setCardFormData] = useState({
    number: "",
    expiry: "",
    holder: "",
    brand: "",
  });
  const [showSetDefaultCardDialog, setShowSetDefaultCardDialog] =
    useState(false);
  const [selectedCardForDefault, setSelectedCardForDefault] = useState<
    string | null
  >(null);
  // Wallet Adjustment
  const [walletAdjustValue, setWalletAdjustValue] = useState("");
  const [walletAdjustType, setWalletAdjustType] = useState("add");
  const [walletAdjustReason, setWalletAdjustReason] = useState("");
  const [showWalletConfirmDialog, setShowWalletConfirmDialog] = useState(false);
  const [isApplyingWallet, setIsApplyingWallet] = useState(false);
  // Permissions
  const [isPermissionsEditMode, setIsPermissionsEditMode] = useState(false);
  const [permissionsEditedData, setPermissionsEditedData] = useState<{
    role?: string;
    permissions?: string[];
  }>({});
  const [showPermissionsConfirmDialog, setShowPermissionsConfirmDialog] =
    useState(false);
  const [permissionsOpenAccordions, setPermissionsOpenAccordions] = useState<
    string[]
  >(["role", "admin", "financial", "operational", "reports", "system"]);
  // Wallet Statement
  const [walletStatements, setWalletStatements] = useState<
    Array<{
      id: string;
      date: string;
      type: "credit" | "debit" | "blocked";
      amount: number;
      reason: string;
      balanceAfter: number;
      admin: string;
    }>
  >([]);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementFilters, setStatementFilters] = useState({
    type: "all",
    startDate: "",
    endDate: "",
    search: "",
  });
  // Blocked Credit
  const [blockedBalance, setBlockedBalance] = useState<number>(0);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [creditType, setCreditType] = useState<"immediate" | "blocked">(
    "immediate",
  );
  const [creditReason, setCreditReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [showUnblockRequestModal, setShowUnblockRequestModal] = useState(false);
  const [unblockInvoice, setUnblockInvoice] = useState<File | null>(null);
  // Unblock Requests (Admin)
  const [unblockRequests, setUnblockRequests] = useState<
    Array<{
      id: string;
      userId: string;
      userName: string;
      amount: number;
      date: string;
      invoiceUrl: string;
      status: "pending" | "approved" | "rejected";
    }>
  >([]);
  const [showUnblockRequestsModal, setShowUnblockRequestsModal] =
    useState(false);

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [passwordResetMethod, setPasswordResetMethod] = useState<
    "email" | "link" | "direct"
  >("email");
  const [generatedResetLink, setGeneratedResetLink] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [twoFAQRCode, setTwoFAQRCode] = useState("");
  const [twoFAManualKey, setTwoFAManualKey] = useState("");
  const [twoFAVerificationCode, setTwoFAVerificationCode] = useState("");
  const [showTwoFAVerification, setShowTwoFAVerification] = useState(false);
  const [twoFALastValidation, setTwoFALastValidation] = useState("");
  const [twoFAActivationDate, setTwoFAActivationDate] = useState("");
  const [activeSessions, setActiveSessions] = useState<
    Array<{
      id: string;
      location: string;
      ip: string;
      browser: string;
      os: string;
      loginTime: string;
      status: "active" | "expired";
    }>
  >([]);
  const [connectedDevices, setConnectedDevices] = useState<
    Array<{
      id: string;
      name: string;
      type: "mobile" | "desktop" | "tablet";
      lastAccess: string;
      ip: string;
    }>
  >([]);
  const [securityLogs, setSecurityLogs] = useState<
    Array<{
      id: string;
      date: string;
      action: string;
      ip: string;
      location: string;
      admin: string;
    }>
  >([]);
  const [showFullLogsModal, setShowFullLogsModal] = useState(false);
  const [logFilters, setLogFilters] = useState({
    action: "all",
    date: "",
    admin: "",
  });
  const [showConfirmSecurityAction, setShowConfirmSecurityAction] =
    useState(false);
  const [confirmSecurityAction, setConfirmSecurityAction] = useState<{
    type: string;
    message: string;
    callback: () => void;
  } | null>(null);
  const [isSavingSecurityAction, setIsSavingSecurityAction] = useState(false);

  // Header States
  const [showBalanceAllka, setShowBalanceAllka] = useState(true);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  // Linked Entities (Permissions Tab) — derived from context
  const contextUser = user?.id ? getUserById(Number(user.id)) : null;
  const companyAssociations = contextUser?.company_associations || [];
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [expandedAssocId, setExpandedAssocId] = useState<number | null>(null);
  const [expandedProjectCompanyId, setExpandedProjectCompanyId] = useState<
    number | null
  >(null);

  // KPI Card period selectors
  const kpiPeriodOptions = [
    { value: "7", label: "7d" },
    { value: "30", label: "30d" },
    { value: "90", label: "90d" },
    { value: "180", label: "180d" },
  ];
  const [kpiPeriodCard1, setKpiPeriodCard1] = useState("30");
  const [kpiPeriodCard2, setKpiPeriodCard2] = useState("30");
  const [kpiPeriodCard3, setKpiPeriodCard3] = useState("7");

  // --- NOMADE / default ---
  const kpiNomadeCard1: Record<string, { value: string; change: string }> = {
    "7": { value: "289", change: "+8%" },
    "30": { value: "1.247", change: "+12%" },
    "90": { value: "3.812", change: "+15%" },
    "180": { value: "7.430", change: "+9%" },
  };
  const kpiNomadeCard2: Record<
    string,
    { score: number; stars: number; avaliacoes: number; change: string }
  > = {
    "7": { score: 4.7, stars: 5, avaliacoes: 28, change: "+0.3" },
    "30": { score: 4.5, stars: 4, avaliacoes: 125, change: "+0.2" },
    "90": { score: 4.3, stars: 4, avaliacoes: 380, change: "+0.1" },
    "180": { score: 4.1, stars: 4, avaliacoes: 720, change: "-0.1" },
  };
  const kpiNomadeCard3: Record<string, { value: string; nivel: string }> = {
    "7": { value: "87%", nivel: "Alta" },
    "30": { value: "79%", nivel: "Média" },
    "90": { value: "74%", nivel: "Média" },
    "180": { value: "68%", nivel: "Regular" },
  };

  // --- AGENCY ---
  const kpiAgencyCard1: Record<string, { value: string; change: string }> = {
    "7": { value: "148", change: "+6%" },
    "30": { value: "620", change: "+18%" },
    "90": { value: "1.950", change: "+11%" },
    "180": { value: "3.840", change: "+7%" },
  };
  const kpiAgencyCard2: Record<
    string,
    { score: number; stars: number; avaliacoes: number; change: string }
  > = {
    "7": { score: 4.8, stars: 5, avaliacoes: 14, change: "+0.4" },
    "30": { score: 4.6, stars: 5, avaliacoes: 63, change: "+0.3" },
    "90": { score: 4.4, stars: 4, avaliacoes: 190, change: "+0.1" },
    "180": { score: 4.2, stars: 4, avaliacoes: 360, change: "-0.0" },
  };
  const kpiAgencyCard3: Record<string, { value: string; nivel: string }> = {
    "7": { value: "91%", nivel: "Alta" },
    "30": { value: "84%", nivel: "Alta" },
    "90": { value: "76%", nivel: "Média" },
    "180": { value: "71%", nivel: "Média" },
  };

  // --- COMPANY ---
  const kpiCompanyCard1: Record<string, { value: string; change: string }> = {
    "7": { value: "12", change: "+2" },
    "30": { value: "47", change: "+8" },
    "90": { value: "138", change: "+21" },
    "180": { value: "274", change: "+35" },
  };
  const kpiCompanyCard2: Record<string, { value: string; change: string }> = {
    "7": { value: "R$ 38.200", change: "+4%" },
    "30": { value: "R$ 182.400", change: "+14%" },
    "90": { value: "R$ 541.000", change: "+9%" },
    "180": { value: "R$ 1,04M", change: "+6%" },
  };
  const kpiCompanyCard3: Record<string, { value: string; nivel: string }> = {
    "7": { value: "93%", nivel: "Alta" },
    "30": { value: "88%", nivel: "Alta" },
    "90": { value: "80%", nivel: "Alta" },
    "180": { value: "75%", nivel: "Média" },
  };
  const [userLevel, setUserLevel] = useState(3); // 1-5 stars
  const [levelProgress, setLevelProgress] = useState(65); // percentage to next level
  const [userPlan, setUserPlan] = useState<"free" | "premium" | "vip">(
    "premium",
  );

  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();

  const fakeUser = createFakeUserData(user);

  // Usar dados persistidos se existirem, caso contrário usar fakeUser
  const displayUser = { ...fakeUser, ...persistedUserData };

  // Normalizar tipo de conta corretamente, sem fallback silencioso
  const rawAccountType = displayUser?.account_type || displayUser?.tipo;
  const userAccountType = rawAccountType
    ? rawAccountType.toString().toLowerCase()
    : undefined;

  // Derivar status do usuário a partir dos dados persistidos (atualiza ao salvar)
  const userAccountStatus = ((contaEditedData as any).status ??
    (displayUser as any).status ??
    "ativo") as "ativo" | "inativo" | "pausado" | "suspenso";

  // Initialize cards on component mount
  useEffect(() => {
    if (cards.length === 0) {
      // 2 Cartões mockados por padrão
      setCards([
        {
          id: "card_001",
          lastDigits: "4242",
          holder: "JOAO SILVA SANTOS",
          expiry: "12/26",
          brand: "Visa",
          isDefault: true,
        },
        {
          id: "card_002",
          lastDigits: "5555",
          holder: "JOAO SILVA SANTOS",
          expiry: "08/25",
          brand: "Mastercard",
          isDefault: false,
        },
      ]);

      // Inicializar extrato com algumas movimentações mockadas
      setWalletStatements([
        {
          id: "stmt_001",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: "credit",
          amount: 500,
          reason: "Depósito inicial",
          balanceAfter: 2500.75,
          admin: "Admin Sistema",
        },
        {
          id: "stmt_002",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          type: "debit",
          amount: 150,
          reason: "Compra em loja",
          balanceAfter: 2350.75,
          admin: "Automático",
        },
        {
          id: "stmt_003",
          date: new Date().toISOString(),
          type: "credit",
          amount: 25.5,
          reason: "Cashback de compras",
          balanceAfter: 2376.25,
          admin: "Sistema",
        },
      ]);
    }

    // Initialize security data on component mount
    if (activeSessions.length === 0) {
      setActiveSessions([
        {
          id: "session_001",
          location: "São Paulo, SP",
          ip: "187.45.123.45",
          browser: "Chrome 131.0",
          os: "macOS 14.2",
          loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: "active",
        },
        {
          id: "session_002",
          location: "São Paulo, SP",
          ip: "187.45.123.45",
          browser: "Safari 17.2",
          os: "iOS 17.2",
          loginTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
        },
        {
          id: "session_003",
          location: "Rio de Janeiro, RJ",
          ip: "189.23.234.56",
          browser: "Firefox 121.0",
          os: "Windows 11",
          loginTime: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "expired",
        },
      ]);

      setConnectedDevices([
        {
          id: "device_001",
          name: "MacBook Pro de João",
          type: "desktop",
          lastAccess: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          ip: "187.45.123.45",
        },
        {
          id: "device_002",
          name: "iPhone de João",
          type: "mobile",
          lastAccess: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ip: "187.45.123.45",
        },
        {
          id: "device_003",
          name: "Computador do Escritório",
          type: "desktop",
          lastAccess: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ip: "192.168.1.100",
        },
      ]);

      setSecurityLogs([
        {
          id: "log_001",
          date: new Date().toISOString(),
          action: "Login bem-sucedido",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Automático",
        },
        {
          id: "log_002",
          date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          action: "Alteração de dados cadastrais",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Admin User",
        },
        {
          id: "log_003",
          date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          action: "2FA ativado",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Usuário",
        },
        {
          id: "log_004",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          action: "Tentativa de login inválida",
          ip: "189.23.234.56",
          location: "Rio de Janeiro, RJ",
          admin: "Automático",
        },
        {
          id: "log_005",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          action: "Redefinição de senha",
          ip: "192.168.1.100",
          location: "Escritório",
          admin: "Admin User",
        },
      ]);

      setTwoFAActivationDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );
      setTwoFALastValidation(
        new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      );
      setIs2FAEnabled(true);
    }
  }, []);

  // Define panel positioning - Extends from sidebar to right edge
  const [panelStyle, setPanelStyle] = useState<{ left: string; width: string }>(
    {
      left: "240px",
      width: "calc(100vw - 240px)",
    },
  );

  useEffect(() => {
    const calculatePanelStyle = () => {
      const sidebarWidthPx =
        typeof sidebarWidth === "number"
          ? sidebarWidth
          : parseInt(sidebarWidth as string) || 240;
      setPanelStyle({
        left: `${sidebarWidthPx}px`,
        width: `calc(100vw - ${sidebarWidthPx}px)`,
      });
    };

    calculatePanelStyle();
    window.addEventListener("resize", calculatePanelStyle);
    return () => window.removeEventListener("resize", calculatePanelStyle);
  }, [sidebarWidth]);

  useEffect(() => {
    if (!open) {
      setIsClosing(false);
    }
  }, [open]);

  useEffect(() => {
    const statuses = ["online", "busy", "away", "offline"];
    const interval = setInterval(() => {
      setOnlineStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    if (isEditMode) {
      const hasChanges = Object.keys(editedData).length > 0;
      if (hasChanges && !confirm("Há alterações não salvas. Descartar?"))
        return;
      setIsEditMode(false);
      setEditedData({});
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 420);
  };

  const handleEditMode = () => {
    setIsEditMode(true);
    setEditedData({});
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedData({});
  };

  const handleSave = async () => {
    if (!editedData.name || !editedData.email) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await apiClient.updateUser(String(user.id), {
        name: editedData.name,
        email: editedData.email,
        phone: editedData.phone || undefined,
        role: editedData.role || undefined,
        account_type: editedData.account_type || undefined,
      });
      toast({
        title: "Sucesso!",
        description: "Dados atualizados com sucesso",
      });
      setIsEditMode(false);
      setEditedData({});
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const getDisplayValue = (field: string) => {
    return (
      editedData[field as keyof typeof editedData] ??
      fakeUser[field as keyof UserType]
    );
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(
      { user: fakeUser, exportedAt: new Date().toISOString() },
      null,
      2,
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuario-${fakeUser.id}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Sucesso!", description: "Dados exportados com sucesso" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
        };
      case "busy":
        return {
          bg: "bg-amber-100",
          text: "text-amber-700",
          dot: "bg-amber-500",
        };
      case "away":
        return {
          bg: "bg-slate-100",
          text: "text-slate-700",
          dot: "bg-slate-500",
        };
      case "offline":
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const handleContaEditMode = () => {
    setIsContaEditMode(true);
    setContaEditedData({});
  };

  const handleContaCancelEdit = () => {
    setIsContaEditMode(false);
    setContaEditedData({});
    setShowConfirmDialog(false);
  };

  // Handlers para aba "Dados"
  const handleDadosEditMode = () => {
    setIsDadosEditMode(true);
    setDadosEditedData({});
  };

  const handleDadosCancelEdit = () => {
    setIsDadosEditMode(false);
    setDadosEditedData({});
    setShowDadosConfirmDialog(false);
  };

  const handleDadosFieldChange = (field: string, value: any) => {
    setDadosEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const getDadosDisplayValue = (field: string) => {
    return (
      dadosEditedData[field as keyof typeof dadosEditedData] ??
      displayUser[field as keyof UserType]
    );
  };

  const handleDadosSaveClick = () => {
    setShowDadosConfirmDialog(true);
  };

  const handleDadosSaveConfirm = async () => {
    setIsSaving(true);
    try {
      if (!user?.id) throw new Error("ID do usuário não encontrado");
      await apiClient.updateUser(String(user.id), {
        name: dadosEditedData.name || undefined,
        email: dadosEditedData.email || undefined,
        phone: dadosEditedData.phone || undefined,
      });
      setPersistedUserData((prev) => ({ ...prev, ...dadosEditedData }));
      toast({
        title: "Sucesso!",
        description: "Dados atualizados com sucesso",
      });
      setIsDadosEditMode(false);
      setDadosEditedData({});
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setShowDadosConfirmDialog(false);
      setIsSaving(false);
    }
  };

  // Handlers para aba "Financeiro"
  const handleFinancialEditMode = () => {
    setIsFinancialEditMode(true);
    setFinancialEditedData({});
  };

  const handleFinancialCancelEdit = () => {
    setIsFinancialEditMode(false);
    setFinancialEditedData({});
    setShowFinancialConfirmDialog(false);
  };

  const handleFinancialFieldChange = (field: string, value: any) => {
    setFinancialEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const getFinancialDisplayValue = (field: string) => {
    return (
      financialEditedData[field as keyof typeof financialEditedData] ??
      displayUser[field as keyof UserType]
    );
  };

  const handleFinancialSaveClick = () => {
    setShowFinancialConfirmDialog(true);
  };

  const handleFinancialSaveConfirm = async () => {
    setIsSaving(true);
    try {
      if (!user?.id) throw new Error("ID do usuário não encontrado");
      const payload: Record<string, any> = {};
      if (financialEditedData.phone) payload.phone = financialEditedData.phone;
      if (Object.keys(payload).length > 0) {
        await apiClient.updateUser(String(user.id), payload);
      }
      setPersistedUserData((prev) => ({ ...prev, ...financialEditedData }));
      toast({
        title: "Sucesso!",
        description: "Dados financeiros atualizados com sucesso",
      });
      setIsFinancialEditMode(false);
      setFinancialEditedData({});
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setShowFinancialConfirmDialog(false);
      setIsSaving(false);
    }
  };

  // Card Handlers
  const handleAddCard = () => {
    setCardFormData({ number: "", expiry: "", holder: "", brand: "" });
    setShowCardModal(true);
  };

  const handleSaveCard = () => {
    if (!cardFormData.number || !cardFormData.expiry || !cardFormData.holder) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos do cartão",
        variant: "destructive",
      });
      return;
    }
    const lastDigits = cardFormData.number.slice(-4);
    const newCard = {
      id: `card_${Date.now()}`,
      lastDigits,
      holder: cardFormData.holder.toUpperCase(),
      expiry: cardFormData.expiry,
      brand: cardFormData.brand || "Visa",
      isDefault: cards.length === 0,
    };
    setCards([...cards, newCard]);
    setShowCardModal(false);
    toast({ title: "Sucesso!", description: "Cartão adicionado com sucesso" });
  };

  const handleDeleteCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
    toast({ title: "Sucesso!", description: "Cartão removido com sucesso" });
  };

  const handleSetDefaultCard = (cardId: string) => {
    setSelectedCardForDefault(cardId);
    setShowSetDefaultCardDialog(true);
  };

  const handleConfirmSetDefaultCard = () => {
    if (selectedCardForDefault) {
      setCards(
        cards.map((c) => ({
          ...c,
          isDefault: c.id === selectedCardForDefault,
        })),
      );
      toast({ title: "Sucesso!", description: "Cartão definido como padrão" });
      setShowSetDefaultCardDialog(false);
      setSelectedCardForDefault(null);
    }
  };

  // Balance Addition Handlers
  const handleAddBalance = () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido",
        variant: "destructive",
      });
      return;
    }
    if (!creditReason.trim()) {
      toast({
        title: "Erro",
        description: "Informe o motivo da operação",
        variant: "destructive",
      });
      return;
    }
    setShowWalletConfirmDialog(true);
  };

  const handleConfirmAddBalance = async () => {
    setIsApplyingWallet(true);
    try {
      const amount = parseFloat(creditAmount);
      const currentBalance = (displayUser.wallet_balance as number) || 0;
      let newBalance = currentBalance;

      if (creditType === "immediate") {
        newBalance = currentBalance + amount;
      }

      const newStatement = {
        id: `stmt_${Date.now()}`,
        date: new Date().toISOString(),
        type:
          creditType === "blocked" ? ("blocked" as const) : ("credit" as const),
        amount,
        reason: creditReason,
        balanceAfter: creditType === "blocked" ? currentBalance : newBalance,
        admin: "Admin User",
      };

      if (creditType === "blocked") {
        setBlockedBalance((prev) => prev + amount);
      } else {
        setPersistedUserData((prev) => ({
          ...prev,
          wallet_balance: newBalance,
        }));
      }

      setWalletStatements([newStatement, ...walletStatements]);
      toast({
        title: "Sucesso!",
        description: `${creditType === "blocked" ? "Crédito bloqueado" : "Crédito"} adicionado com sucesso`,
      });
      setCreditAmount("");
      setCreditReason("");
      setShowAddBalanceModal(false);
      setShowWalletConfirmDialog(false);
    } catch (error) {
      console.error("Error adding balance:", error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar crédito",
        variant: "destructive",
      });
    } finally {
      setIsApplyingWallet(false);
    }
  };

  const handleRequestUnblock = () => {
    if (!unblockInvoice) {
      toast({
        title: "Erro",
        description: "Anexe uma nota fiscal",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Sucesso!",
      description: "Solicitação de desbloqueio enviada para análise",
    });
    setShowUnblockRequestModal(false);
    setUnblockInvoice(null);
  };

  const handleApproveUnblockRequest = (requestId: string) => {
    const request = unblockRequests.find((r) => r.id === requestId);
    if (request) {
      setBlockedBalance((prev) => prev - request.amount);
      setUnblockRequests(
        unblockRequests.map((r) =>
          r.id === requestId ? { ...r, status: "approved" as const } : r,
        ),
      );
      toast({ title: "Sucesso!", description: "Solicitação aprovada" });
    }
  };

  const handleRejectUnblockRequest = (requestId: string) => {
    setUnblockRequests(
      unblockRequests.map((r) =>
        r.id === requestId ? { ...r, status: "rejected" as const } : r,
      ),
    );
    toast({ title: "Sucesso!", description: "Solicitação rejeitada" });
  };

  // Security Handlers
  const handlePasswordReset = () => {
    setPasswordResetMethod("email");
    setGeneratedResetLink("");
    setShowPasswordResetModal(true);
  };

  const handleConfirmPasswordReset = async () => {
    setIsSavingSecurityAction(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (passwordResetMethod === "email") {
        toast({
          title: "Sucesso!",
          description: "Email de redefinição enviado para " + displayUser.email,
        });
      } else if (passwordResetMethod === "link") {
        const link = `https://allka.com/auth/reset-password?token=tk_${Date.now()}&user=${displayUser.id}`;
        setGeneratedResetLink(link);
        toast({
          title: "Link gerado!",
          description: "Copie o link para compartilhar com o usuário",
        });
      } else if (passwordResetMethod === "direct") {
        const newPassword = Math.random().toString(36).substring(2, 15);
        toast({
          title: "Sucesso!",
          description: "Senha redefinida para: " + newPassword,
        });
      }

      const logEntry = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        action: `Redefinição de senha (${passwordResetMethod})`,
        ip: "187.45.123.45",
        location: "São Paulo, SP",
        admin: "Admin User",
      };
      setSecurityLogs([logEntry, ...securityLogs]);

      setShowPasswordResetModal(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Erro",
        description: "Falha ao redefinir senha",
        variant: "destructive",
      });
    } finally {
      setIsSavingSecurityAction(false);
    }
  };

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setConfirmSecurityAction({
        type: "disable-2fa",
        message:
          "Tem certeza que deseja desativar 2FA? Isso reduzirá a segurança da conta.",
        callback: handleDisable2FA,
      });
      setShowConfirmSecurityAction(true);
    } else {
      setShow2FASetupModal(true);
      setTwoFAQRCode(
        "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=otpauth://totp/joao%40allka.com?secret=JBSWY3DPEBLW64TMMQ======",
      );
      setTwoFAManualKey("JBSWY3DPEBLW64TMMQ======");
    }
  };

  const handleDisable2FA = async () => {
    setIsSavingSecurityAction(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIs2FAEnabled(false);
      const logEntry = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        action: "2FA desativado",
        ip: "187.45.123.45",
        location: "São Paulo, SP",
        admin: "Usuário",
      };
      setSecurityLogs([logEntry, ...securityLogs]);
      toast({ title: "Sucesso!", description: "2FA foi desativado" });
      setShowConfirmSecurityAction(false);
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast({
        title: "Erro",
        description: "Falha ao desativar 2FA",
        variant: "destructive",
      });
    } finally {
      setIsSavingSecurityAction(false);
    }
  };

  const handleVerify2FACode = async () => {
    if (!twoFAVerificationCode || twoFAVerificationCode.length !== 6) {
      toast({
        title: "Erro",
        description: "Digite um código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsSavingSecurityAction(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIs2FAEnabled(true);
      setTwoFAActivationDate(new Date().toISOString());
      setTwoFALastValidation(new Date().toISOString());

      const logEntry = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        action: "2FA ativado",
        ip: "187.45.123.45",
        location: "São Paulo, SP",
        admin: "Usuário",
      };
      setSecurityLogs([logEntry, ...securityLogs]);

      toast({ title: "Sucesso!", description: "2FA foi ativado com sucesso" });
      setShow2FASetupModal(false);
      setShowTwoFAVerification(false);
      setTwoFAVerificationCode("");
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      toast({
        title: "Erro",
        description: "Código inválido",
        variant: "destructive",
      });
    } finally {
      setIsSavingSecurityAction(false);
    }
  };

  const handleEndSession = (sessionId: string) => {
    setActiveSessions(activeSessions.filter((s) => s.id !== sessionId));
    const session = activeSessions.find((s) => s.id === sessionId);
    const logEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      action: `Sessão encerrada (${session?.browser})`,
      ip: session?.ip || "N/A",
      location: session?.location || "N/A",
      admin: "Admin User",
    };
    setSecurityLogs([logEntry, ...securityLogs]);
    toast({ title: "Sucesso!", description: "Sessão encerrada" });
  };

  const handleEndAllSessions = () => {
    setConfirmSecurityAction({
      type: "end-all-sessions",
      message:
        "Tem certeza que deseja encerrar TODAS as sessões? O usuário será desconectado de todos os dispositivos.",
      callback: () => {
        setActiveSessions([]);
        const logEntry = {
          id: `log_${Date.now()}`,
          date: new Date().toISOString(),
          action: "Todas as sessões encerradas",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Admin User",
        };
        setSecurityLogs([logEntry, ...securityLogs]);
        toast({
          title: "Sucesso!",
          description: "Todas as sessões foram encerradas",
        });
        setShowConfirmSecurityAction(false);
      },
    });
    setShowConfirmSecurityAction(true);
  };

  const handleRevokeDevice = (deviceId: string) => {
    setConnectedDevices(connectedDevices.filter((d) => d.id !== deviceId));
    const device = connectedDevices.find((d) => d.id === deviceId);
    const logEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      action: `Dispositivo revogado: ${device?.name}`,
      ip: device?.ip || "N/A",
      location: "N/A",
      admin: "Admin User",
    };
    setSecurityLogs([logEntry, ...securityLogs]);
    toast({ title: "Sucesso!", description: "Dispositivo revogado" });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência",
    });
  };

  const handleAccordionChange = (
    value: string | string[],
    isSingleMode: boolean,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (isSingleMode) {
      // Single mode - only one accordion open at a time
      setter(typeof value === "string" ? [value] : (value as string[]));
    } else {
      // Multiple mode - can have multiple accordions open
      setter(value as string[]);
    }
  };

  const handleApplyWalletAdjustment = () => {
    if (!walletAdjustValue || parseFloat(walletAdjustValue) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido",
        variant: "destructive",
      });
      return;
    }
    setShowWalletConfirmDialog(true);
  };

  const handleConfirmWalletAdjustment = async () => {
    setIsApplyingWallet(true);
    try {
      const adjustValue = parseFloat(walletAdjustValue);
      const currentBalance = (displayUser.wallet_balance as number) || 0;
      const newBalance =
        walletAdjustType === "add"
          ? currentBalance + adjustValue
          : currentBalance - adjustValue;

      if (newBalance < 0) {
        toast({
          title: "Erro",
          description: "Saldo não pode ser negativo",
          variant: "destructive",
        });
        return;
      }

      setPersistedUserData((prev) => ({ ...prev, wallet_balance: newBalance }));
      toast({
        title: "Sucesso!",
        description: `Saldo atualizado para R$ ${newBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });
      setWalletAdjustValue("");
      setShowWalletConfirmDialog(false);
    } catch (error) {
      console.error("Error applying wallet adjustment:", error);
      toast({
        title: "Erro",
        description: "Falha ao aplicar ajuste",
        variant: "destructive",
      });
    } finally {
      setIsApplyingWallet(false);
    }
  };

  // Permissions Handlers
  const handlePermissionsEditMode = () => {
    setIsPermissionsEditMode(true);
    setPermissionsEditedData({
      role: displayUser.role as string,
      permissions: (displayUser.permissions as string[]) || [],
    });
  };

  const handlePermissionsCancelEdit = () => {
    setIsPermissionsEditMode(false);
    setPermissionsEditedData({});
    setShowPermissionsConfirmDialog(false);
  };

  const handlePermissionsFieldChange = (field: string, value: any) => {
    setPermissionsEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission: string) => {
    const currentPerms = permissionsEditedData.permissions || [];
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter((p) => p !== permission)
      : [...currentPerms, permission];
    setPermissionsEditedData((prev) => ({ ...prev, permissions: newPerms }));
  };

  const handlePermissionsSaveClick = () => {
    setShowPermissionsConfirmDialog(true);
  };

  const handlePermissionsSaveConfirm = async () => {
    setIsSaving(true);
    try {
      if (!user?.id) throw new Error("ID do usuário não encontrado");
      const updatedRole = permissionsEditedData.role || displayUser.role;
      const updatedPermissions =
        permissionsEditedData.permissions || displayUser.permissions;
      await apiClient.updateUser(String(user.id), { role: updatedRole });
      setPersistedUserData((prev) => ({
        ...prev,
        role: updatedRole,
        permissions: updatedPermissions,
      }));
      toast({
        title: "Sucesso!",
        description: "Permissões atualizadas com sucesso",
      });
      setIsPermissionsEditMode(false);
      setPermissionsEditedData({});
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setShowPermissionsConfirmDialog(false);
      setIsSaving(false);
    }
  };

  // Filtrar extrato
  const getFilteredStatements = () => {
    return walletStatements.filter((stmt) => {
      if (
        statementFilters.type !== "all" &&
        stmt.type !== statementFilters.type
      )
        return false;
      if (
        statementFilters.startDate &&
        new Date(stmt.date) < new Date(statementFilters.startDate)
      )
        return false;
      if (
        statementFilters.endDate &&
        new Date(stmt.date) > new Date(statementFilters.endDate)
      )
        return false;
      return true;
    });
  };

  const handleContaSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleContaSaveConfirm = async () => {
    // Validar dados obrigatórios se forem alterados
    const nameToSave =
      contaEditedData.name ?? dadosEditedData.name ?? displayUser.name;
    const emailToSave =
      contaEditedData.email ?? dadosEditedData.email ?? displayUser.email;

    if (!nameToSave || !emailToSave) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
      return;
    }

    setIsSaving(true);

    // Mesclar dados de conta + dados pessoais no mesmo payload
    const updatePayload = {
      ...displayUser,
      ...dadosEditedData,
      ...contaEditedData,
      name: nameToSave,
      email: emailToSave,
      id: displayUser.id,
    };

    // Atualiza estado local imediatamente (optimistic update)
    setPersistedUserData((prev) => ({ ...prev, ...updatePayload }));
    toast({ title: "Sucesso!", description: "Dados atualizados com sucesso" });
    setIsContaEditMode(false);
    setContaEditedData({});
    setIsDadosEditMode(false);
    setDadosEditedData({});
    setShowConfirmDialog(false);
    setIsSaving(false);

    // Sincroniza com a API
    try {
      await apiClient.updateUser(String(displayUser.id), {
        name: nameToSave,
        email: emailToSave,
        phone: contaEditedData.phone || dadosEditedData.phone || undefined,
        role: contaEditedData.role || undefined,
        account_type: contaEditedData.account_type || undefined,
      });
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Sincronização com servidor falhou.",
        variant: "destructive",
      });
    }
  };

  const handleContaFieldChange = (field: string, value: any) => {
    setContaEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const getContaDisplayValue = (field: string) => {
    return (
      contaEditedData[field as keyof typeof contaEditedData] ??
      displayUser[field as keyof UserType]
    );
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Password Reset Handlers
  const handleResetPassword = async () => {
    setIsResettingPassword(true);
    await new Promise((r) => setTimeout(r, 800));
    const token = `tk_${Date.now()}`;
    setResetPasswordToken(token);
    setResetPasswordUrl(
      `https://allka.com/auth/reset-password?token=${token}&user=${fakeUser.id}`,
    );
    toast({
      title: "Sucesso!",
      description:
        "Token de recuperação gerado. Copie o link abaixo para enviar ao usuário.",
    });
    setIsResettingPassword(false);
  };

  const handleSendResetEmail = async () => {
    setIsSendingResetEmail(true);
    await new Promise((r) => setTimeout(r, 800));
    toast({
      title: "Sucesso!",
      description: "Email de recuperação enviado para " + fakeUser.email,
    });
    setIsSendingResetEmail(false);
  };

  const handleCopyResetLink = () => {
    if (resetPasswordUrl) {
      navigator.clipboard.writeText(resetPasswordUrl);
      toast({
        title: "Copiado!",
        description: "Link copiado para a área de transferência",
      });
    }
  };

  const handleStatusChange = (
    newStatus: "ativo" | "inativo" | "pausado" | "suspenso",
  ) => {
    if (!isContaEditMode) return;
    handleContaFieldChange("status", newStatus);
  };

  const handleLevelChange = (newLevel: "free" | "premium" | "vip") => {
    if (!isContaEditMode) return;
    handleContaFieldChange("account_type", newLevel);
  };

  const getCurrentStatus = (): "ativo" | "inativo" | "pausado" | "suspenso" => {
    // Prioridade: editado > persistido > padrão
    return (
      (contaEditedData.status as any) ?? (displayUser.status as any) ?? "ativo"
    );
  };

  const getCurrentLevel = (): "free" | "premium" | "vip" => {
    return (
      (contaEditedData.account_type as any) ??
      (displayUser.account_type as any) ??
      "premium"
    );
  };

  const handleAccountStatusUpdate = (
    newStatus: "ativo" | "inativo" | "pausado" | "suspenso",
  ) => {
    if (!isContaEditMode) return;
    handleContaFieldChange("status", newStatus);
  };

  const handleAccountLevelUpdate = (newLevel: "free" | "premium" | "vip") => {
    if (!isContaEditMode) return;
    handleContaFieldChange("account_type", newLevel);
  };

  const getStatusBadgeColor = (
    status: "ativo" | "inativo" | "pausado" | "suspenso",
  ) => {
    switch (status) {
      case "ativo":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "inativo":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "pausado":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "suspenso":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getAccountLevelBadgeColor = (level: "free" | "premium" | "vip") => {
    switch (level) {
      case "free":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "premium":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "vip":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const statusColors = getStatusColor(onlineStatus);
  const statusLabel = {
    online: "Online",
    busy: "Ocupado",
    away: "Ausente",
    offline: "Offline",
  };

  if (!open && !isClosing) return null;

  return (
    <>
      <div
        data-slot="sheet-content"
        data-state={isClosing ? "closed" : "open"}
        className="fixed top-0 z-50 h-[calc(100vh-24px)] bg-background flex flex-col shadow-2xl border-l border-border overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
        style={{
          left: panelStyle.left,
          width: panelStyle.width,
        }}
      >
        {/* Header - Modern and Premium */}
        <UserViewHeader
          user={displayUser}
          isEditMode={isEditMode}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          onClose={handleClose}
          onExport={handleExport}
          userLevel={userLevel}
          levelProgress={levelProgress}
          userAccountStatus={userAccountStatus}
          userAccountType={userAccountType}
          userPlan={userPlan}
          showBalance={showBalanceAllka}
          onToggleBalance={() => setShowBalanceAllka(!showBalanceAllka)}
        />

        {/* Content with Tabs */}
        <Tabs
          defaultValue="visao-geral"
          className="flex-1 flex flex-col min-h-0"
        >
          {/* Tab Navigation - Fixed */}
          <div className="flex-shrink-0 bg-white px-[50px] pt-0 pb-[10px] overflow-x-auto">
            <TabsList className="grid w-max grid-cols-5 gap-1 bg-transparent p-0 h-auto">
              {["visao-geral", "conta", "permissoes", "seguranca", "lgpd"].map(
                (tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                  >
                    {tab === "visao-geral" && "Visão Geral"}
                    {tab === "conta" && "Conta & Dados"}
                    {tab === "permissoes" && "Permissões"}
                    {tab === "seguranca" && "Segurança"}
                    {tab === "lgpd" && "LGPD & Privacidade"}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </div>

          {/* Tab Content - Scrollable */}
          <TabsContent
            value="visao-geral"
            className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-6 space-y-4 mt-0"
          >
            {/* Expandir toggle */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  const keys = ["estatisticas-user", "info-principais"];
                  const allOpen = keys.every((k) => openAccordions.includes(k));
                  setOpenAccordions(
                    allOpen
                      ? openAccordions.filter((a) => !keys.includes(a))
                      : [
                          ...openAccordions,
                          ...keys.filter((k) => !openAccordions.includes(k)),
                        ],
                  );
                }}
                className="flex items-center gap-2 group"
              >
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                  {["estatisticas-user", "info-principais"].every((k) =>
                    openAccordions.includes(k),
                  )
                    ? "Fechar"
                    : "Expandir"}
                </span>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    ["estatisticas-user", "info-principais"].every((k) =>
                      openAccordions.includes(k),
                    )
                      ? "bg-blue-500"
                      : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      ["estatisticas-user", "info-principais"].every((k) =>
                        openAccordions.includes(k),
                      )
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* KPI Cards Row - 3 colunas compactas */}
            {(() => {
              const isCompany = userAccountType === "company";
              const isAgency = userAccountType === "agency";
              const c1Data = isCompany
                ? kpiCompanyCard1[kpiPeriodCard1]
                : isAgency
                  ? kpiAgencyCard1[kpiPeriodCard1]
                  : kpiNomadeCard1[kpiPeriodCard1];
              const c2DataNota = !isCompany
                ? isAgency
                  ? kpiAgencyCard2[kpiPeriodCard2]
                  : kpiNomadeCard2[kpiPeriodCard2]
                : null;
              const c2CompData = isCompany
                ? kpiCompanyCard2[kpiPeriodCard2]
                : null;
              const c3Data = isCompany
                ? kpiCompanyCard3[kpiPeriodCard3]
                : isAgency
                  ? kpiAgencyCard3[kpiPeriodCard3]
                  : kpiNomadeCard3[kpiPeriodCard3];

              const PeriodBtns = ({
                active,
                setActive,
                activeColor,
              }: {
                active: string;
                setActive: (v: string) => void;
                activeColor: string;
              }) => (
                <div className="flex gap-1 flex-wrap mb-1">
                  {kpiPeriodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setActive(opt.value)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                        active === opt.value
                          ? activeColor
                          : "bg-white/70 text-slate-500 hover:bg-white hover:text-slate-700 border border-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              );

              return (
                <div className="grid grid-cols-3 gap-3">
                  {/* Card 1 */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-3 py-2.5 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-none">
                        {isCompany
                          ? "Projetos ativos"
                          : isAgency
                            ? "Tarefas distribuídas"
                            : "Tarefas executadas"}
                      </span>
                      <div className="p-1 bg-white rounded-md border border-blue-200 flex-shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1.5">
                      {c1Data.value}
                    </div>
                    <PeriodBtns
                      active={kpiPeriodCard1}
                      setActive={setKpiPeriodCard1}
                      activeColor="bg-blue-600 text-white"
                    />
                    <div className="text-[11px] text-slate-500">
                      {c1Data.change} vs. últimos {kpiPeriodCard1} dias
                    </div>
                  </div>

                  {/* Card 2 */}
                  {isCompany ? (
                    <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg px-3 py-2.5 border border-violet-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-none">
                          Receita gerada
                        </span>
                        <div className="p-1 bg-white rounded-md border border-violet-200 flex-shrink-0">
                          <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 mb-1.5">
                        {c2CompData!.value}
                      </div>
                      <PeriodBtns
                        active={kpiPeriodCard2}
                        setActive={setKpiPeriodCard2}
                        activeColor="bg-violet-600 text-white"
                      />
                      <div className="text-[11px] text-slate-500">
                        {c2CompData!.change} vs. últimos {kpiPeriodCard2} dias
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg px-3 py-2.5 border border-amber-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-none">
                          Nota na plataforma
                        </span>
                        <div className="p-1 bg-white rounded-md border border-amber-200 flex-shrink-0">
                          <Activity className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-2xl font-bold text-slate-900">
                          {c2DataNota!.score}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-sm ${s <= c2DataNota!.stars ? "text-amber-400" : "text-slate-300"}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <PeriodBtns
                        active={kpiPeriodCard2}
                        setActive={setKpiPeriodCard2}
                        activeColor="bg-amber-500 text-white"
                      />
                      <div className="text-[11px] text-slate-500">
                        {c2DataNota!.avaliacoes} avaliações ·{" "}
                        {c2DataNota!.change} últimos {kpiPeriodCard2}d
                      </div>
                    </div>
                  )}

                  {/* Card 3 - Taxa de Atividade */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg px-3 py-2.5 border border-emerald-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-none">
                        Taxa de atividade
                      </span>
                      <div className="p-1 bg-white rounded-md border border-emerald-200 flex-shrink-0">
                        <Zap className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1.5">
                      {c3Data.value}
                    </div>
                    <PeriodBtns
                      active={kpiPeriodCard3}
                      setActive={setKpiPeriodCard3}
                      activeColor="bg-emerald-600 text-white"
                    />
                    <div className="text-[11px] text-slate-500">
                      Últimos {kpiPeriodCard3} dias · {c3Data.nivel}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Estatísticas - Accordion compacto */}
            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-3"
            >
              <AccordionItem
                value="estatisticas-user"
                className="border border-slate-200 rounded-lg"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold text-slate-900">
                      Estatísticas de Uso
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-slate-100 pb-0">
                  <div className="px-3 py-3 rounded-b-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock className="h-3 w-3 text-emerald-600" />
                          <span className="text-[10px] font-medium text-emerald-900">
                            Último login
                          </span>
                        </div>
                        <p className="text-sm font-bold text-emerald-700">
                          Hoje
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          14:30 (2h atrás)
                        </p>
                      </div>
                      <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/50 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Activity className="h-3 w-3 text-purple-600" />
                          <span className="text-[10px] font-medium text-purple-900">
                            Média sessão
                          </span>
                        </div>
                        <p className="text-sm font-bold text-purple-700">
                          18 min
                        </p>
                        <p className="text-[10px] text-purple-600">
                          Tempo médio
                        </p>
                      </div>
                      <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <TrendingUp className="h-3 w-3 text-blue-600" />
                          <span className="text-[10px] font-medium text-blue-900">
                            Progresso nota
                          </span>
                        </div>
                        <p className="text-sm font-bold text-blue-700">90%</p>
                        <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: "90%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Charts - lado a lado compacto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">
                  Acessos (30 dias)
                </h4>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={accessChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="acessos"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: "#2563eb", r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">
                  Módulos Mais Usados
                </h4>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart
                    data={moduleUsageData}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 55, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis
                      dataKey="nome"
                      type="category"
                      tick={{ fontSize: 9 }}
                      width={50}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "none",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="uso" fill="#3b82f6" radius={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Informações Principais - Accordion compacto */}
            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-3"
            >
              <AccordionItem
                value="info-principais"
                className="border border-slate-200 rounded-lg"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      Informações Principais
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 py-2 border-t border-slate-100 pb-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">ID</span>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700">
                        {displayUser.id}
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Tipo</span>
                      {(() => {
                        const normalized = userAccountType
                          ? String(userAccountType).toLowerCase().trim()
                          : null;
                        if (normalized === "company")
                          return (
                            <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] px-1.5 py-0">
                              Company
                            </Badge>
                          );
                        if (normalized === "nomad")
                          return (
                            <Badge className="btn-brand text-white text-[10px] px-1.5 py-0">
                              Nomad
                            </Badge>
                          );
                        if (normalized === "agency")
                          return (
                            <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] px-1.5 py-0">
                              Agency
                            </Badge>
                          );
                        if (normalized)
                          return (
                            <Badge className="bg-slate-600 text-[10px] px-1.5 py-0">
                              {userAccountType}
                            </Badge>
                          );
                        return (
                          <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">
                            {getCurrentLevel().charAt(0).toUpperCase() +
                              getCurrentLevel().slice(1)}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Função</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        Admin
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Status</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Conta + Dados Unificado */}
          <TabsContent
            value="conta"
            className="flex-1 flex flex-col overflow-hidden bg-slate-200 mt-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0 px-[50px] pt-[25px] pb-4 bg-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Conta &amp; Dados
              </h3>
              <div className="flex items-center gap-2">
                {/* Expandir toggle */}
                <button
                  onClick={() => {
                    const allOpen = USER_DADOS_ALL_ACCORDIONS.every((a) =>
                      dadosOpenAccordions.includes(a),
                    );
                    setDadosOpenAccordions(
                      allOpen ? [] : USER_DADOS_ALL_ACCORDIONS,
                    );
                  }}
                  className="flex items-center gap-2 group"
                  title={
                    USER_DADOS_ALL_ACCORDIONS.every((a) =>
                      dadosOpenAccordions.includes(a),
                    )
                      ? "Fechar todos"
                      : "Abrir todos"
                  }
                >
                  <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                    {USER_DADOS_ALL_ACCORDIONS.every((a) =>
                      dadosOpenAccordions.includes(a),
                    )
                      ? "Fechar"
                      : "Expandir"}
                  </span>
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                      USER_DADOS_ALL_ACCORDIONS.every((a) =>
                        dadosOpenAccordions.includes(a),
                      )
                        ? "bg-blue-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        USER_DADOS_ALL_ACCORDIONS.every((a) =>
                          dadosOpenAccordions.includes(a),
                        )
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
                {/* Edit/Save/Cancel */}
                {!isContaEditMode && !isDadosEditMode ? (
                  <Button
                    onClick={() => {
                      handleContaEditMode();
                      handleDadosEditMode();
                    }}
                    size="sm"
                    className="btn-brand"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleContaSaveClick}
                      size="sm"
                      disabled={isSaving}
                      className="btn-brand"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingCancelCallback(() => () => {
                          handleContaCancelEdit();
                          setIsDadosEditMode(false);
                          setDadosEditedData({});
                        });
                        setShowCancelEditConfirm(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Accordions */}
            <div className="flex-1 overflow-y-auto px-[50px] pb-6">
              <Accordion
                type="multiple"
                value={dadosOpenAccordions}
                onValueChange={setDadosOpenAccordions}
                className="space-y-3"
              >
                {/* 1. DADOS DA CONTA */}
                <AccordionItem
                  value="dados-principais"
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Dados da Conta
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {/* Nome Completo */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Nome Completo
                        </p>
                        {isContaEditMode ? (
                          <Input
                            value={getContaDisplayValue("name") as string}
                            onChange={(e) =>
                              handleContaFieldChange("name", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="Nome completo"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getContaDisplayValue("name")}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Email
                        </p>
                        {isContaEditMode ? (
                          <Input
                            type="email"
                            value={getContaDisplayValue("email") as string}
                            onChange={(e) =>
                              handleContaFieldChange("email", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="email@exemplo.com"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {getContaDisplayValue("email")}
                          </p>
                        )}
                      </div>

                      {/* Username / Login */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Username / Login
                        </p>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {displayUser.email?.split("@")[0] || "username"}
                        </p>
                      </div>

                      {/* ID Interno */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          ID Interno
                        </p>
                        <p className="text-sm font-semibold text-slate-800 font-mono">
                          {displayUser.id}
                        </p>
                      </div>

                      {/* Data Criação */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Data de Criação
                        </p>
                        <p className="text-sm font-semibold text-slate-800">
                          10 jan 2024
                        </p>
                      </div>

                      {/* Último Login */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Último Login
                        </p>
                        <p className="text-sm font-semibold text-slate-800">
                          Hoje às 14:30
                        </p>
                      </div>

                      {/* Tipo de Usuário */}
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 md:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Tipo de Usuário
                        </p>
                        {isContaEditMode ? (
                          <select
                            value={
                              (getContaDisplayValue("role") as string) ||
                              "admin"
                            }
                            onChange={(e) =>
                              handleContaFieldChange("role", e.target.value)
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm font-medium bg-white"
                          >
                            <option value="admin">Admin</option>
                            <option value="nômade">Nômade</option>
                            <option value="líder">Líder</option>
                            <option value="usuário">Usuário</option>
                          </select>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-300 capitalize text-xs">
                            {getContaDisplayValue("role")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. STATUS DA CONTA */}
                <AccordionItem
                  value="status-conta"
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Status da Conta
                      </span>
                      <Badge
                        className={`ml-auto ${getStatusBadgeColor(getCurrentStatus())} border text-[10px]`}
                      >
                        {getCurrentStatus().charAt(0).toUpperCase() +
                          getCurrentStatus().slice(1)}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Status da Conta
                      </p>
                      {isContaEditMode ? (
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              {
                                value: "ativo",
                                label: "Ativo",
                                active:
                                  "bg-emerald-500 text-white border-emerald-500",
                                inactive:
                                  "bg-white text-slate-600 border-slate-300 hover:border-emerald-400 hover:text-emerald-600",
                              },
                              {
                                value: "inativo",
                                label: "Inativo",
                                active:
                                  "bg-slate-500 text-white border-slate-500",
                                inactive:
                                  "bg-white text-slate-600 border-slate-300 hover:border-slate-400",
                              },
                              {
                                value: "pausado",
                                label: "Pausado",
                                active:
                                  "bg-amber-500 text-white border-amber-500",
                                inactive:
                                  "bg-white text-slate-600 border-slate-300 hover:border-amber-400 hover:text-amber-600",
                              },
                              {
                                value: "suspenso",
                                label: "Suspenso",
                                active: "bg-red-500 text-white border-red-500",
                                inactive:
                                  "bg-white text-slate-600 border-slate-300 hover:border-red-400 hover:text-red-600",
                              },
                            ] as const
                          ).map((s) => (
                            <button
                              key={s.value}
                              onClick={() => handleStatusChange(s.value)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${getCurrentStatus() === s.value ? s.active : s.inactive}`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            getCurrentStatus() === "ativo"
                              ? "bg-emerald-500 text-white"
                              : getCurrentStatus() === "inativo"
                                ? "bg-slate-300 text-slate-700"
                                : getCurrentStatus() === "pausado"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                          }`}
                        >
                          {getCurrentStatus() === "ativo" && (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          {getCurrentStatus() === "inativo" && (
                            <PauseCircle className="h-3.5 w-3.5" />
                          )}
                          {getCurrentStatus() === "pausado" && (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          {getCurrentStatus() === "suspenso" && (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {getCurrentStatus().charAt(0).toUpperCase() +
                            getCurrentStatus().slice(1)}
                        </span>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. DADOS PESSOAIS */}
                <AccordionItem
                  value="pessoais"
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Dados Pessoais
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Nome Completo
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={getDadosDisplayValue("name") as string}
                            onChange={(e) =>
                              handleDadosFieldChange("name", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("name")}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Nome Social
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("social_name") as string) ||
                              ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "social_name",
                                e.target.value,
                              )
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="Se aplicável"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("social_name") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Data de Nascimento
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            type="date"
                            value={
                              (getDadosDisplayValue("birth_date") as string) ||
                              ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "birth_date",
                                e.target.value,
                              )
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("birth_date") ||
                              "15 mai 1990"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Sexo / Gênero
                        </p>
                        {isDadosEditMode ? (
                          <select
                            value={
                              (getDadosDisplayValue("gender") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("gender", e.target.value)
                            }
                            className="w-full border border-slate-300 rounded px-2 py-0.5 text-sm font-medium bg-white"
                          >
                            <option value="">Selecione</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                            <option value="O">Outro</option>
                            <option value="N">Prefiro não informar</option>
                          </select>
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("gender") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          CPF / Documento
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("cpf") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("cpf", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm font-mono"
                            placeholder="000.000.000-00"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 font-mono">
                            {getDadosDisplayValue("cpf") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          RG
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={(getDadosDisplayValue("rg") as string) || ""}
                            onChange={(e) =>
                              handleDadosFieldChange("rg", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="RG"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("rg") || "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 5. CONTATO */}
                <AccordionItem
                  value="contato"
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Contato
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 md:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Email
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            type="email"
                            value={getDadosDisplayValue("email") as string}
                            onChange={(e) =>
                              handleDadosFieldChange("email", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("email")}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Telefone Principal
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            type="tel"
                            value={
                              (getDadosDisplayValue("phone") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("phone", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="(00) 00000-0000"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("phone") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          WhatsApp
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            type="tel"
                            value={
                              (getDadosDisplayValue("whatsapp") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("whatsapp", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="(00) 00000-0000"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("whatsapp") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Telefone Secundário
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            type="tel"
                            value={
                              (getDadosDisplayValue(
                                "phone_secondary",
                              ) as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "phone_secondary",
                                e.target.value,
                              )
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="(00) 00000-0000"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("phone_secondary") || "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 6. ENDEREÇO */}
                <AccordionItem
                  value="endereco"
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Endereço
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          CEP
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("zip_code") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("zip_code", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm font-mono"
                            placeholder="00000-000"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 font-mono">
                            {getDadosDisplayValue("zip_code") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Rua
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("street") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("street", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="Nome da rua"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("street") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Número
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("number") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("number", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="123"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("number") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Complemento
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("complement") as string) ||
                              ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "complement",
                                e.target.value,
                              )
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="Apto, Bloco..."
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("complement") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Bairro
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue(
                                "neighborhood",
                              ) as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "neighborhood",
                                e.target.value,
                              )
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="Nome do bairro"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("neighborhood") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Cidade
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("city") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("city", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="São Paulo"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("city") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Estado
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("state") as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "state",
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="SP"
                            maxLength={2}
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("state") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          País
                        </p>
                        {isDadosEditMode ? (
                          <Input
                            value={
                              (getDadosDisplayValue("country") as string) ||
                              "Brasil"
                            }
                            onChange={(e) =>
                              handleDadosFieldChange("country", e.target.value)
                            }
                            className="border-slate-300 bg-white h-7 text-sm"
                            placeholder="Brasil"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800">
                            {getDadosDisplayValue("country") || "Brasil"}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 7. INFORMAÇÕES ADICIONAIS */}
                <AccordionItem
                  value="adicionais"
                  className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Informações Adicionais
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <div className="space-y-1.5">
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Observações Administrativas
                        </p>
                        {isDadosEditMode ? (
                          <textarea
                            value={
                              (getDadosDisplayValue("admin_notes") as string) ||
                              ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "admin_notes",
                                e.target.value,
                              )
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-medium min-h-16 bg-white"
                            placeholder="Notas visíveis para admin"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                            {getDadosDisplayValue("admin_notes") || "—"}
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Notas Internas
                        </p>
                        {isDadosEditMode ? (
                          <textarea
                            value={
                              (getDadosDisplayValue(
                                "internal_notes",
                              ) as string) || ""
                            }
                            onChange={(e) =>
                              handleDadosFieldChange(
                                "internal_notes",
                                e.target.value,
                              )
                            }
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-medium min-h-16 bg-white"
                            placeholder="Notas internas do sistema"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                            {getDadosDisplayValue("internal_notes") || "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* Permissões */}
          <TabsContent
            value="permissoes"
            className="flex-1 flex flex-col overflow-hidden bg-slate-100 mt-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0 px-[50px] pt-5 pb-3 bg-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Controle de Acesso
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!isPermissionsEditMode ? (
                  <Button
                    onClick={handlePermissionsEditMode}
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs gap-1.5 bg-white"
                  >
                    <Edit2 className="h-3 w-3" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-1.5">
                    <Button
                      onClick={handlePermissionsSaveClick}
                      size="sm"
                      disabled={isSaving}
                      className="btn-brand h-7 px-3 text-xs gap-1.5"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingCancelCallback(
                          () => handlePermissionsCancelEdit,
                        );
                        setShowCancelEditConfirm(true);
                      }}
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs gap-1.5 bg-white"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-[50px] pb-6 space-y-3">
              {/* PERFIS DE PERMISSÃO */}
              {(() => {
                const systemProfiles = [
                  {
                    id: "super-admin",
                    name: "Super Admin",
                    desc: "Acesso total ao sistema",
                    color: "bg-red-100 text-red-700 border-red-200",
                    dot: "bg-red-500",
                  },
                  {
                    id: "gerente-ops",
                    name: "Gerente de Operações",
                    desc: "Gestão de projetos e nômades",
                    color: "bg-blue-100 text-blue-700 border-blue-200",
                    dot: "bg-blue-500",
                  },
                  {
                    id: "analista-fin",
                    name: "Analista Financeiro",
                    desc: "Acesso a relatórios financeiros",
                    color: "bg-amber-100 text-amber-700 border-amber-200",
                    dot: "bg-amber-500",
                  },
                  {
                    id: "suporte",
                    name: "Suporte N1",
                    desc: "Atendimento e tickets básicos",
                    color: "bg-green-100 text-green-700 border-green-200",
                    dot: "bg-green-500",
                  },
                  {
                    id: "leitura",
                    name: "Somente Leitura",
                    desc: "Visualização sem alterações",
                    color: "bg-slate-100 text-slate-600 border-slate-200",
                    dot: "bg-slate-400",
                  },
                ];
                const currentProfile =
                  permissionsEditedData.role || "gerente-ops";
                return (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                      <Shield className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Perfil de Permissão
                      </span>
                      <span className="ml-auto text-xs text-slate-400">
                        Definidos em Permissões
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-1 gap-1.5">
                      {systemProfiles.map((profile) => {
                        const isSelected = currentProfile === profile.id;
                        return (
                          <div
                            key={profile.id}
                            onClick={() =>
                              isPermissionsEditMode &&
                              handlePermissionsFieldChange("role", profile.id)
                            }
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${isPermissionsEditMode ? "cursor-pointer" : "cursor-default"} ${isSelected ? "border-blue-300 bg-blue-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full flex-shrink-0 ${profile.dot}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 leading-tight">
                                {profile.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {profile.desc}
                              </div>
                            </div>
                            {isSelected && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0">
                                Ativo
                              </Badge>
                            )}
                            {isPermissionsEditMode && !isSelected && (
                              <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                            )}
                            {isPermissionsEditMode && isSelected && (
                              <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* VÍNCULOS */}
              {(() => {
                const available = MOCK_COMPANIES.filter(
                  (c) =>
                    !companyAssociations.some((a) => a.company_id === c.id) &&
                    (linkSearchQuery === "" ||
                      c.name
                        .toLowerCase()
                        .includes(linkSearchQuery.toLowerCase()) ||
                      c.document
                        .toLowerCase()
                        .includes(linkSearchQuery.toLowerCase())),
                );
                return (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                      <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Vínculos
                      </span>
                      <Badge className="ml-1 text-[10px] px-1.5 bg-slate-100 text-slate-600 border-0">
                        {companyAssociations.length}
                      </Badge>
                      {isPermissionsEditMode && (
                        <button
                          onClick={() => {
                            setShowAddCompany((v) => !v);
                            setLinkSearchQuery("");
                          }}
                          className={`ml-auto flex items-center gap-1 text-xs font-medium transition-colors ${showAddCompany ? "text-slate-500 hover:text-slate-700" : "text-blue-600 hover:text-blue-700"}`}
                        >
                          {showAddCompany ? (
                            <>
                              <XCircle className="h-3 w-3" /> Fechar
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" /> Vincular
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Search Panel */}
                    {showAddCompany && isPermissionsEditMode && (
                      <div className="border-b border-slate-100">
                        <div className="px-3 py-2 bg-slate-50">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={linkSearchQuery}
                              onChange={(e) =>
                                setLinkSearchQuery(e.target.value)
                              }
                              placeholder="Buscar empresa pelo nome ou CNPJ..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {available.length === 0 && (
                            <div className="px-4 py-4 text-center text-xs text-slate-400">
                              {linkSearchQuery
                                ? `Nenhum resultado para "${linkSearchQuery}"`
                                : "Todas as empresas já estão vinculadas"}
                            </div>
                          )}
                          {available.map((item) => {
                            const initials = item.name
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase();
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  if (!user?.id) return;
                                  addCompanyLink(Number(user.id), {
                                    id: Date.now(),
                                    user_id: Number(user.id),
                                    company_id: item.id,
                                    company_name: item.name,
                                    role: "company_user",
                                    permissions: ["view_projects"],
                                    company_permissions: {
                                      ...DEFAULT_COMPANY_PERMISSIONS,
                                    },
                                    project_memberships: [],
                                    is_active: true,
                                    joined_at: new Date()
                                      .toISOString()
                                      .split("T")[0],
                                  });
                                  setLinkSearchQuery("");
                                  setShowAddCompany(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                              >
                                <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {initials}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 leading-tight truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">
                                    {item.document}
                                  </div>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Linked List */}
                    <div className="divide-y divide-slate-100">
                      {companyAssociations.length === 0 && (
                        <div className="px-4 py-4 text-center text-xs text-slate-400">
                          Nenhum vínculo ativo
                        </div>
                      )}
                      {companyAssociations.map((assoc) => {
                        const initials = assoc.company_name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase();
                        const isExpanded = expandedAssocId === assoc.id;
                        const projExpanded =
                          expandedProjectCompanyId === assoc.company_id;
                        const compPerms =
                          assoc.company_permissions ||
                          DEFAULT_COMPANY_PERMISSIONS;
                        const memberships = assoc.project_memberships || [];
                        const availableProjects = (
                          MOCK_COMPANY_PROJECTS[assoc.company_id] || []
                        ).filter(
                          (p) =>
                            !memberships.some((m) => m.project_id === p.id),
                        );
                        return (
                          <div key={assoc.id}>
                            <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {initials}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 leading-tight truncate">
                                  {assoc.company_name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {assoc.role === "company_admin"
                                    ? "Admin"
                                    : "Colaborador"}{" "}
                                  · desde {assoc.joined_at}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    setExpandedAssocId(
                                      isExpanded ? null : assoc.id,
                                    )
                                  }
                                  className={`h-6 px-2 rounded-md hover:bg-blue-100 flex items-center justify-center transition-colors text-[10px] font-medium gap-1 ${isExpanded ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-blue-600"}`}
                                >
                                  <Shield className="h-3 w-3" /> Perms
                                </button>
                                {isPermissionsEditMode && (
                                  <button
                                    onClick={() =>
                                      user?.id &&
                                      removeCompanyLink(
                                        Number(user.id),
                                        assoc.company_id,
                                      )
                                    }
                                    className="h-6 w-6 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-3">
                                {/* Company-level permissions */}
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                      Permissões na Empresa
                                    </p>
                                    {!isPermissionsEditMode && (
                                      <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
                                        somente leitura
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {(
                                      Object.entries(compPerms) as [
                                        string,
                                        {
                                          id: string;
                                          name: string;
                                          enabled: boolean;
                                        }[],
                                      ][]
                                    ).map(([category, perms]) => (
                                      <div key={category}>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                                          {category === "gestao"
                                            ? "Gestão"
                                            : category === "tasks"
                                              ? "Tarefas"
                                              : category === "projects"
                                                ? "Projetos"
                                                : "Usuários"}
                                        </p>
                                        <div className="space-y-1.5">
                                          {perms.map((perm) => (
                                            <div
                                              key={perm.id}
                                              className="flex items-center justify-between"
                                            >
                                              <span className="text-xs text-slate-600">
                                                {perm.name}
                                              </span>
                                              <Switch
                                                checked={perm.enabled}
                                                disabled={
                                                  !isPermissionsEditMode
                                                }
                                                onCheckedChange={(checked) => {
                                                  if (
                                                    !isPermissionsEditMode ||
                                                    !user?.id
                                                  )
                                                    return;
                                                  const updated = {
                                                    ...compPerms,
                                                    [category]: compPerms[
                                                      category as keyof typeof compPerms
                                                    ].map((p: any) =>
                                                      p.id === perm.id
                                                        ? {
                                                            ...p,
                                                            enabled: checked,
                                                          }
                                                        : p,
                                                    ),
                                                  };
                                                  updateCompanyLink(
                                                    Number(user.id),
                                                    assoc.company_id,
                                                    {
                                                      company_permissions:
                                                        updated,
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
                                </div>

                                {/* Project memberships */}
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">
                                      Projetos
                                    </p>
                                    {isPermissionsEditMode &&
                                      availableProjects.length > 0 && (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button className="flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700">
                                              <Plus className="h-3 w-3" />{" "}
                                              Adicionar
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent
                                            className="w-56 p-2"
                                            align="end"
                                          >
                                            {availableProjects.map((proj) => (
                                              <button
                                                key={proj.id}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs text-slate-700"
                                                onClick={() => {
                                                  if (!user?.id) return;
                                                  upsertProjectMembership(
                                                    Number(user.id),
                                                    assoc.company_id,
                                                    {
                                                      project_id: proj.id,
                                                      project_name: proj.name,
                                                      permissions: ["view"],
                                                    },
                                                  );
                                                }}
                                              >
                                                {proj.name}
                                              </button>
                                            ))}
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                  </div>
                                  {memberships.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 text-center py-2">
                                      Nenhum projeto vinculado.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {memberships.map((m) => (
                                        <div
                                          key={m.project_id}
                                          className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                                        >
                                          <div className="flex items-center justify-between px-3 py-1.5 bg-violet-50/60 border-b border-slate-200">
                                            <span className="text-xs font-semibold text-slate-700">
                                              {m.project_name}
                                            </span>
                                            {isPermissionsEditMode && (
                                              <button
                                                className="text-slate-400 hover:text-red-500"
                                                onClick={() =>
                                                  user?.id &&
                                                  removeProjectMembership(
                                                    Number(user.id),
                                                    assoc.company_id,
                                                    m.project_id,
                                                  )
                                                }
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-1 px-3 py-2">
                                            {ALL_PROJECT_PERMISSIONS.map(
                                              (perm) => {
                                                const active =
                                                  m.permissions.includes(
                                                    perm.id,
                                                  );
                                                return (
                                                  <button
                                                    key={perm.id}
                                                    disabled={
                                                      !isPermissionsEditMode
                                                    }
                                                    onClick={() => {
                                                      if (
                                                        !isPermissionsEditMode ||
                                                        !user?.id
                                                      )
                                                        return;
                                                      const newPerms = active
                                                        ? m.permissions.filter(
                                                            (p) =>
                                                              p !== perm.id,
                                                          )
                                                        : [
                                                            ...m.permissions,
                                                            perm.id,
                                                          ];
                                                      upsertProjectMembership(
                                                        Number(user.id),
                                                        assoc.company_id,
                                                        {
                                                          ...m,
                                                          permissions: newPerms,
                                                        },
                                                      );
                                                    }}
                                                    className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors ${active ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-slate-50 text-slate-400 border-slate-200"} ${isPermissionsEditMode ? "cursor-pointer hover:border-violet-200 hover:text-violet-600" : "cursor-default"}`}
                                                  >
                                                    {perm.label}
                                                  </button>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* PERMISSÕES INDIVIDUAIS */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                  <Lock className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Permissões Individuais
                  </span>
                  <Badge className="ml-1 text-[10px] px-1.5 bg-emerald-100 text-emerald-700 border-0">
                    {isPermissionsEditMode
                      ? (permissionsEditedData.permissions || []).length
                      : ((displayUser.permissions as string[]) || [])
                          .length}{" "}
                    ativas
                  </Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      group: "Administração",
                      icon: <Lock className="h-3 w-3 text-red-500" />,
                      perms: [
                        { id: "manage_users", label: "Gerenciar usuários" },
                        {
                          id: "manage_permissions",
                          label: "Gerenciar permissões",
                        },
                        { id: "view_sensitive", label: "Dados sensíveis" },
                        { id: "reset_password", label: "Resetar senhas" },
                        {
                          id: "access_admin_panel",
                          label: "Painel administrativo",
                        },
                      ],
                    },
                    {
                      group: "Financeiro",
                      icon: <DollarSign className="h-3 w-3 text-amber-500" />,
                      perms: [
                        {
                          id: "view_financial",
                          label: "Visualizar financeiro",
                        },
                        { id: "edit_financial", label: "Editar financeiro" },
                        { id: "adjust_balance", label: "Ajustar saldo" },
                        { id: "manage_cards", label: "Gerenciar cartões" },
                        { id: "manage_accounts", label: "Contas bancárias" },
                      ],
                    },
                    {
                      group: "Operacional",
                      icon: <Zap className="h-3 w-3 text-yellow-500" />,
                      perms: [
                        { id: "create_tasks", label: "Criar tarefas" },
                        { id: "edit_tasks", label: "Editar tarefas" },
                        { id: "delete_tasks", label: "Excluir tarefas" },
                        { id: "assign_tasks", label: "Atribuir tarefas" },
                        { id: "approve_tasks", label: "Aprovar tarefas" },
                      ],
                    },
                    {
                      group: "Relatórios",
                      icon: <BarChart3 className="h-3 w-3 text-green-500" />,
                      perms: [
                        { id: "view_reports", label: "Visualizar relatórios" },
                        { id: "export_reports", label: "Exportar relatórios" },
                        { id: "view_metrics", label: "Métricas avançadas" },
                      ],
                    },
                    {
                      group: "Sistema",
                      icon: <Settings className="h-3 w-3 text-purple-500" />,
                      perms: [
                        { id: "access_settings", label: "Configurações" },
                        { id: "manage_integrations", label: "Integrações" },
                        { id: "view_logs", label: "Logs do sistema" },
                      ],
                    },
                  ].map((group) => (
                    <div key={group.group} className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        {group.icon}
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          {group.group}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.perms.map((perm) => {
                          const currentPerms = isPermissionsEditMode
                            ? permissionsEditedData.permissions || []
                            : (displayUser.permissions as string[]) || [];
                          const isActive = currentPerms.includes(perm.id);
                          return (
                            <button
                              key={perm.id}
                              onClick={() =>
                                isPermissionsEditMode &&
                                handlePermissionToggle(perm.id)
                              }
                              disabled={!isPermissionsEditMode}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all ${isPermissionsEditMode ? "cursor-pointer" : "cursor-default"} ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"} ${isPermissionsEditMode && isActive ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""} ${isPermissionsEditMode && !isActive ? "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200" : ""}`}
                            >
                              {isActive ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full border border-current" />
                              )}
                              {perm.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Segurança */}
          <TabsContent
            value="seguranca"
            className="flex-1 flex flex-col overflow-hidden bg-slate-200 mt-0"
          >
            {/* Security Header */}
            <div className="flex items-center justify-between flex-shrink-0 px-[50px] pt-[25px] pb-4 bg-slate-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Segurança da Conta
                </h3>
                <Badge className="bg-emerald-100 text-emerald-700 font-semibold">
                  Segura
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-[50px] pb-6">
              <Accordion
                type="multiple"
                value={securityOpenAccordions}
                onValueChange={setSecurityOpenAccordions}
                className="space-y-3"
              >
                {/* 1. AUTENTICAÇÃO E SENHA */}
                <AccordionItem
                  value="auth"
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-slate-900">
                        Autenticação e Senha
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            Força da Senha
                          </h4>
                          <p className="text-xs text-slate-600 mt-1">
                            Sua senha é forte e segura
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          Forte
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div>✓ Contém letras maiúsculas e minúsculas</div>
                        <div>✓ Contém números</div>
                        <div>✓ Contém caracteres especiais</div>
                        <div>✓ Tem mais de 12 caracteres</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 block uppercase">
                        Ações de Senha
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          onClick={handlePasswordReset}
                          className="btn-brand justify-start gap-2"
                        >
                          <Key className="h-4 w-4" />
                          Redefinir Senha
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                      <div>Última alteração: 45 dias atrás</div>
                      <div className="text-slate-500 mt-1">
                        Recomendamos alterar a senha a cada 90 dias
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. AUTENTICAÇÃO EM DOIS FATORES */}
                <AccordionItem
                  value="2fa"
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-slate-900">
                        Autenticação em Dois Fatores (2FA)
                      </span>
                      {is2FAEnabled && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">
                          Ativado
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-4">
                    <div
                      className={`p-4 rounded-lg ${is2FAEnabled ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            Status 2FA
                          </h4>
                          <p className="text-xs text-slate-600 mt-1">
                            Proteção adicional com autenticador
                          </p>
                        </div>
                        <Badge
                          className={
                            is2FAEnabled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }
                        >
                          {is2FAEnabled ? "Ativado" : "Inativo"}
                        </Badge>
                      </div>
                      {is2FAEnabled && (
                        <div className="space-y-1 text-xs text-slate-600">
                          <div>
                            ✓ Ativação:{" "}
                            {new Date(twoFAActivationDate).toLocaleDateString(
                              "pt-BR",
                            )}
                          </div>
                          <div>
                            ✓ Última validação:{" "}
                            {new Date(twoFALastValidation).toLocaleTimeString(
                              "pt-BR",
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleToggle2FA}
                      className={
                        is2FAEnabled
                          ? "bg-red-600 hover:bg-red-700 justify-start gap-2 w-full"
                          : "btn-brand justify-start gap-2 w-full"
                      }
                    >
                      <Smartphone className="h-4 w-4" />
                      {is2FAEnabled ? "Desativar 2FA" : "Ativar 2FA"}
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. SESSÕES ATIVAS */}
                <AccordionItem
                  value="sessions"
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-slate-900">
                        Sessões Ativas
                      </span>
                      <Badge className="bg-slate-200 text-slate-700 text-xs ml-2">
                        {
                          activeSessions.filter((s) => s.status === "active")
                            .length
                        }
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-3">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-slate-600" />
                              <span className="font-semibold text-slate-900">
                                {session.browser}
                              </span>
                              {session.status === "active" && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                  Ativa
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 space-y-1">
                              <div>OS: {session.os}</div>
                              <div>Local: {session.location}</div>
                              <div>IP: {session.ip}</div>
                              <div>
                                Login:{" "}
                                {new Date(session.loginTime).toLocaleString(
                                  "pt-BR",
                                )}
                              </div>
                            </div>
                          </div>
                          {session.status === "active" && (
                            <Button
                              onClick={() => handleEndSession(session.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                              Encerrar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {activeSessions.length > 0 && (
                      <Button
                        onClick={handleEndAllSessions}
                        variant="outline"
                        className="w-full text-red-600 hover:bg-red-50 border-red-200 bg-transparent"
                      >
                        Encerrar Todas as Sessões
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* 4. DISPOSITIVOS CONECTADOS */}
                <AccordionItem
                  value="devices"
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Tablet className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-slate-900">
                        Dispositivos Conectados
                      </span>
                      <Badge className="bg-slate-200 text-slate-700 text-xs ml-2">
                        {connectedDevices.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-3">
                    {connectedDevices.map((device) => (
                      <div
                        key={device.id}
                        className="border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {device.type === "mobile" ? (
                                <Smartphone className="h-4 w-4" />
                              ) : (
                                <Monitor className="h-4 w-4" />
                              )}
                              <span className="font-semibold text-slate-900">
                                {device.name}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 space-y-1">
                              <div>
                                Tipo:{" "}
                                {device.type === "mobile" ? "Móvel" : "Desktop"}
                              </div>
                              <div>
                                Último acesso:{" "}
                                {new Date(device.lastAccess).toLocaleString(
                                  "pt-BR",
                                )}
                              </div>
                              <div>IP: {device.ip}</div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRevokeDevice(device.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 border-red-200"
                          >
                            Revogar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* 5. LOGS E AUDITORIA */}
                <AccordionItem
                  value="audit"
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-slate-900">
                        Logs e Auditoria
                      </span>
                      <Badge className="bg-slate-200 text-slate-700 text-xs ml-2">
                        {securityLogs.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-3">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {securityLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="border border-slate-200 rounded p-2"
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-sm">
                              <div className="font-semibold text-slate-900">
                                {log.action}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">
                                {new Date(log.date).toLocaleString("pt-BR")}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                            <div>
                              IP: {log.ip} | Local: {log.location}
                            </div>
                            <div>Admin: {log.admin}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => setShowFullLogsModal(true)}
                      variant="outline"
                      className="w-full"
                    >
                      Ver Logs Completos
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* ── LGPD & Privacidade Tab Content ── */}
          <LgpdTabContent
            user={user}
            onUpdate={(updates) => {
              if (user?.id) updateUser(Number(user.id), updates);
              setPersistedUserData((prev) => ({ ...(prev ?? {}), ...updates }));
            }}
          />
        </Tabs>

        {/* Cancel Edit Confirmation Dialog */}
        <AlertDialog
          open={showCancelEditConfirm}
          onOpenChange={setShowCancelEditConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem alterações não salvas. Se continuar, todos os ajustes
                feitos serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel
                onClick={() => setShowCancelEditConfirm(false)}
              >
                Continuar editando
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  pendingCancelCallback?.();
                  setShowCancelEditConfirm(false);
                  setPendingCancelCallback(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Descartar alterações
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Conta Tab */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alterações</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações desta conta? Esta
                ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleContaSaveConfirm}
                disabled={isSaving}
                className="btn-brand"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Dados Tab */}
        <AlertDialog
          open={showDadosConfirmDialog}
          onOpenChange={setShowDadosConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Confirmar alterações dos dados
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações dos dados do
                usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDadosSaveConfirm}
                disabled={isSaving}
                className="btn-brand"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Adding Card */}
        <AlertDialog open={showCardModal} onOpenChange={setShowCardModal}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar Novo Cartão</AlertDialogTitle>
              <AlertDialogDescription>
                Preencha os dados do cartão para adicionar um novo método de
                pagamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Número do Cartão
                </label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardFormData.number}
                  onChange={(e) =>
                    setCardFormData({ ...cardFormData, number: e.target.value })
                  }
                  maxLength="19"
                  className="border-slate-300 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Validade
                  </label>
                  <Input
                    placeholder="MM/YY"
                    value={cardFormData.expiry}
                    onChange={(e) =>
                      setCardFormData({
                        ...cardFormData,
                        expiry: e.target.value,
                      })
                    }
                    maxLength="5"
                    className="border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Bandeira
                  </label>
                  <select
                    value={cardFormData.brand}
                    onChange={(e) =>
                      setCardFormData({
                        ...cardFormData,
                        brand: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">Amex</option>
                    <option value="Elo">Elo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                  Nome do Titular
                </label>
                <Input
                  placeholder="NOME DO TITULAR"
                  value={cardFormData.holder}
                  onChange={(e) =>
                    setCardFormData({
                      ...cardFormData,
                      holder: e.target.value.toUpperCase(),
                    })
                  }
                  className="border-slate-300"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveCard} className="btn-brand">
                Adicionar Cartão
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Wallet Adjustment */}
        <AlertDialog
          open={showWalletConfirmDialog}
          onOpenChange={setShowWalletConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Ajuste de Saldo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja{" "}
                {walletAdjustType === "add" ? "adicionar" : "subtrair"} R${" "}
                {parseFloat(walletAdjustValue).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                do saldo?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Saldo Atual:</span>
                <span className="font-semibold">
                  R${" "}
                  {((displayUser.wallet_balance as number) || 0).toLocaleString(
                    "pt-BR",
                    { minimumFractionDigits: 2 },
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  {walletAdjustType === "add" ? "Adição:" : "Subtração:"}
                </span>
                <span>
                  {walletAdjustType === "add" ? "+" : "-"} R${" "}
                  {parseFloat(walletAdjustValue).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between font-bold">
                <span>Novo Saldo:</span>
                <span className="text-emerald-600">
                  R${" "}
                  {(
                    (walletAdjustType === "add"
                      ? ((displayUser.wallet_balance as number) || 0) +
                        parseFloat(walletAdjustValue)
                      : ((displayUser.wallet_balance as number) || 0) -
                        parseFloat(walletAdjustValue)) || 0
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmWalletAdjustment}
                disabled={isApplyingWallet}
                className="btn-brand"
              >
                {isApplyingWallet ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isApplyingWallet ? "Aplicando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Permissions */}
        <AlertDialog
          open={showPermissionsConfirmDialog}
          onOpenChange={setShowPermissionsConfirmDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Confirmar Alterações de Permissões
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações de permissões deste
                usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Perfil:</span>
                <span className="font-semibold capitalize">
                  {permissionsEditedData.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Permissões:</span>
                <span className="font-semibold">
                  {(permissionsEditedData.permissions || []).length} permissões
                  ativas
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermissionsSaveConfirm}
                disabled={isSaving}
                className="btn-brand"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Set Default Card */}
        <AlertDialog
          open={showSetDefaultCardDialog}
          onOpenChange={setShowSetDefaultCardDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Definir cartão como padrão?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja definir este cartão como seu método de
                pagamento padrão?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSetDefaultCard}
                className="btn-brand"
              >
                Confirmar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Adding Balance/Credit */}
        <AlertDialog
          open={showAddBalanceModal}
          onOpenChange={setShowAddBalanceModal}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar Crédito/Débito</AlertDialogTitle>
              <AlertDialogDescription>
                Preencha os dados para realizar a movimentação.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setCreditType("immediate")}
                    className={
                      creditType === "immediate"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                    }
                  >
                    Imediato
                  </Button>
                  <Button
                    onClick={() => setCreditType("blocked")}
                    className={
                      creditType === "blocked"
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                    }
                  >
                    Bloqueado
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">
                  Valor (R$)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="border-slate-300"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">
                  Motivo (obrigatório)
                </label>
                <Input
                  placeholder="Descreva o motivo da operação"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="border-slate-300"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAddBalance}
                className="btn-brand"
              >
                Próximo
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation for Balance Addition */}
        <AlertDialog
          open={showWalletConfirmDialog && showAddBalanceModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowWalletConfirmDialog(false);
              setShowAddBalanceModal(false);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Movimentação</AlertDialogTitle>
              <AlertDialogDescription>
                Revise os dados antes de confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Tipo:</span>
                <span className="font-semibold">
                  {creditType === "immediate"
                    ? "Crédito Imediato"
                    : "Crédito Bloqueado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Valor:</span>
                <span className="font-semibold text-emerald-600">
                  R${" "}
                  {parseFloat(creditAmount).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Motivo:</span>
                <span className="font-semibold">{creditReason}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                <span className="font-semibold">Saldo após:</span>
                <span className="text-emerald-600 font-bold">
                  R${" "}
                  {(creditType === "blocked"
                    ? (displayUser.wallet_balance as number) || 0
                    : ((displayUser.wallet_balance as number) || 0) +
                      parseFloat(creditAmount)
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAddBalance}
                disabled={isApplyingWallet}
                className="btn-brand"
              >
                {isApplyingWallet ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isApplyingWallet ? "Processando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Requesting Unblock */}
        <AlertDialog
          open={showUnblockRequestModal}
          onOpenChange={setShowUnblockRequestModal}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Solicitar Desbloqueio</AlertDialogTitle>
              <AlertDialogDescription>
                Anexe a nota fiscal para solicitar o desbloqueio de R${" "}
                {blockedBalance.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setUnblockInvoice(e.target.files?.[0] || null)
                  }
                  className="hidden"
                  id="invoice-upload"
                />
                <label htmlFor="invoice-upload" className="cursor-pointer">
                  <div className="text-slate-600 text-sm font-semibold">
                    Clique para selecionar ou arraste a nota fiscal
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    PDF, JPG ou PNG (máx 5MB)
                  </div>
                  {unblockInvoice && (
                    <div className="text-emerald-600 text-sm font-semibold mt-2">
                      ✓ {unblockInvoice.name}
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRequestUnblock}
                className="btn-brand"
              >
                Enviar Solicitação
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Statement */}
        <AlertDialog
          open={showStatementModal}
          onOpenChange={setShowStatementModal}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Extrato Completo</AlertDialogTitle>
              <div className="space-y-2 mt-4">
                <div className="flex gap-2">
                  <select
                    value={statementFilters.type}
                    onChange={(e) =>
                      setStatementFilters({
                        ...statementFilters,
                        type: e.target.value,
                      })
                    }
                    className="border border-slate-300 rounded px-3 py-2 text-sm flex-1"
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="credit">Crédito</option>
                    <option value="debit">Débito</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                  <Input
                    type="text"
                    placeholder="Buscar motivo..."
                    value={statementFilters.search}
                    onChange={(e) =>
                      setStatementFilters({
                        ...statementFilters,
                        search: e.target.value,
                      })
                    }
                    className="border-slate-300 flex-1"
                  />
                </div>
              </div>
            </AlertDialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {walletStatements
                .filter(
                  (s) =>
                    (statementFilters.type === "all" ||
                      s.type === statementFilters.type) &&
                    (statementFilters.search === "" ||
                      s.reason
                        .toLowerCase()
                        .includes(statementFilters.search.toLowerCase())),
                )
                .map((stmt) => (
                  <div
                    key={stmt.id}
                    className="p-3 border border-slate-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {stmt.reason}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(stmt.date).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div
                        className={`font-bold text-right ${stmt.type === "credit" ? "text-emerald-600" : stmt.type === "debit" ? "text-red-600" : "text-yellow-600"}`}
                      >
                        {stmt.type === "credit"
                          ? "+"
                          : stmt.type === "debit"
                            ? "-"
                            : "🔒"}{" "}
                        R${" "}
                        {stmt.amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <div>
                        Admin:{" "}
                        <span className="font-semibold">{stmt.admin}</span>
                      </div>
                      <div>
                        Saldo após:{" "}
                        <span className="font-semibold">
                          R${" "}
                          {stmt.balanceAfter.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Password Reset Modal */}
        <AlertDialog
          open={showPasswordResetModal}
          onOpenChange={setShowPasswordResetModal}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Redefinir Senha do Usuário
              </AlertDialogTitle>
              <AlertDialogDescription>
                Escolha o método para redefinir a senha de {displayUser.name}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button
                  onClick={() => {
                    setPasswordResetMethod("email");
                    setGeneratedResetLink("");
                  }}
                  className={
                    passwordResetMethod === "email"
                      ? "ring-2 ring-blue-600 bg-blue-50 text-slate-900 hover:bg-blue-100"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                  }
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Por Email
                </Button>
                <Button
                  onClick={() => setPasswordResetMethod("link")}
                  className={
                    passwordResetMethod === "link"
                      ? "ring-2 ring-blue-600 bg-blue-50 text-slate-900 hover:bg-blue-100"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Gerar Link
                </Button>
                <Button
                  onClick={() => setPasswordResetMethod("direct")}
                  className={
                    passwordResetMethod === "direct"
                      ? "ring-2 ring-blue-600 bg-blue-50 text-slate-900 hover:bg-blue-100"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                  }
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Redefinir Direto
                </Button>
              </div>

              {passwordResetMethod === "email" && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-900 mb-2">
                    Um email será enviado para:
                  </p>
                  <p className="text-sm font-semibold text-blue-700">
                    {displayUser.email}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    O usuário terá 24 horas para completar a redefinição
                  </p>
                </div>
              )}

              {passwordResetMethod === "link" && (
                <div className="space-y-2">
                  {generatedResetLink ? (
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        Link de Redefinição Gerado:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={generatedResetLink}
                          readOnly
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            handleCopyToClipboard(generatedResetLink)
                          }
                          variant="outline"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">
                        Este link expira em 24 horas
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Clique em "Gerar Link" para criar um link de redefinição
                      único
                    </p>
                  )}
                </div>
              )}

              {passwordResetMethod === "direct" && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-slate-900 mb-2">
                    Uma nova senha será gerada automaticamente e compartilhada
                    com você
                  </p>
                  <p className="text-xs text-amber-700 font-semibold mt-2">
                    ⚠ Isso gera uma senha aleatória que será válida por 24 horas
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmPasswordReset}
                disabled={isSavingSecurityAction}
                className="btn-brand"
              >
                {isSavingSecurityAction ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isSavingSecurityAction
                  ? "Processando..."
                  : passwordResetMethod === "link"
                    ? "Gerar Link"
                    : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* 2FA Setup Modal */}
        <AlertDialog
          open={show2FASetupModal}
          onOpenChange={setShow2FASetupModal}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Configurar Autenticação em Dois Fatores
              </AlertDialogTitle>
              <AlertDialogDescription>
                Siga os passos para ativar 2FA com seu autenticador
              </AlertDialogDescription>
            </AlertDialogHeader>

            {!showTwoFAVerification ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-3">
                    Passo 1: Escaneie o código QR
                  </p>
                  <div className="flex justify-center mb-4">
                    <img
                      src={twoFAQRCode || "/placeholder.svg"}
                      alt="QR Code"
                      className="h-48 w-48"
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    Use Google Authenticator, Microsoft Authenticator ou Authy
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    Passo 2: Chave Manual (se necessário)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={twoFAManualKey}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleCopyToClipboard(twoFAManualKey)}
                      variant="outline"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => setShowTwoFAVerification(true)}
                  className="w-full btn-brand"
                >
                  Próximo: Verificar Código
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-slate-900 mb-3">
                    Passo 3: Verificar Código
                  </p>
                  <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">
                    Digite o código de 6 dígitos do seu autenticador
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength="6"
                    value={twoFAVerificationCode}
                    onChange={(e) =>
                      setTwoFAVerificationCode(
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowTwoFAVerification(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleVerify2FACode}
                    disabled={isSavingSecurityAction}
                    className="flex-1 btn-brand"
                  >
                    {isSavingSecurityAction ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {isSavingSecurityAction ? "Verificando..." : "Ativar 2FA"}
                  </Button>
                </div>
              </div>
            )}
          </AlertDialogContent>
        </AlertDialog>

        {/* Full Logs Modal */}
        <AlertDialog
          open={showFullLogsModal}
          onOpenChange={setShowFullLogsModal}
        >
          <AlertDialogContent className="max-w-4xl max-h-96">
            <AlertDialogHeader>
              <AlertDialogTitle>Logs Completos de Auditoria</AlertDialogTitle>
              <div className="space-y-2 mt-4">
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={logFilters.action}
                    onChange={(e) =>
                      setLogFilters({ ...logFilters, action: e.target.value })
                    }
                    className="border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="all">Todas as ações</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="password">Redefinição de Senha</option>
                    <option value="2fa">2FA</option>
                    <option value="dados">Alteração de Dados</option>
                  </select>
                  <Input
                    type="date"
                    value={logFilters.date}
                    onChange={(e) =>
                      setLogFilters({ ...logFilters, date: e.target.value })
                    }
                    className="border-slate-300"
                  />
                </div>
              </div>
            </AlertDialogHeader>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {securityLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {log.action}
                      </div>
                      <div className="text-xs text-slate-600">
                        {new Date(log.date).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {log.admin}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>IP: {log.ip}</div>
                    <div>Local: {log.location}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <Button variant="outline" size="sm">
                Exportar CSV
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Security Actions */}
        <AlertDialog
          open={showConfirmSecurityAction}
          onOpenChange={setShowConfirmSecurityAction}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Ação de Segurança</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmSecurityAction?.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmSecurityAction?.callback();
                  setShowConfirmSecurityAction(false);
                }}
                disabled={isSavingSecurityAction}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSavingSecurityAction ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirmar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function LgpdTabContent({
  user,
  onUpdate,
}: {
  user: any;
  onUpdate: (u: any) => void;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [legalBasis, setLegalBasis] = useState(
    user?.lgpd?.legal_basis ?? "consent",
  );
  const [commOptIn, setCommOptIn] = useState(
    user?.lgpd?.communication_opt_in ?? false,
  );
  const [lgpdData, setLgpdData] = useState(user?.lgpd);

  const purposes = lgpdData?.data_processing_purposes ?? [];
  const history = lgpdData?.consent_history ?? [];

  const legalBasisLabels: Record<string, string> = {
    consent: "Consentimento (Art. 7º, I)",
    contract: "Execução de contrato (Art. 7º, V)",
    legitimate_interest: "Legítimo interesse (Art. 7º, IX)",
    legal_obligation: "Obrigação legal (Art. 7º, II)",
  };

  const handleSaveConsent = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const newLgpd = {
      ...(lgpdData ?? {}),
      legal_basis: legalBasis,
      communication_opt_in: commOptIn,
    };
    onUpdate({ lgpd: newLgpd });
    setLgpdData(newLgpd);
    setIsSaving(false);
    toast({
      title: "Consentimento atualizado",
      description: "Dados LGPD salvos com sucesso.",
    });
  };

  const handleRequestDeletion = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const newLgpd = {
      ...(lgpdData ?? {}),
      deletion_requested: true,
      deletion_requested_at: new Date().toISOString().split("T")[0],
    };
    onUpdate({ lgpd: newLgpd });
    setLgpdData(newLgpd);
    setIsSaving(false);
    toast({
      title: "Solicitação enviada",
      description: "Solicitação de exclusão registrada.",
      variant: "destructive",
    });
  };

  const handleExportData = () => {
    const exportPayload = {
      user_id: user?.id,
      name: user?.name,
      email: user?.email,
      exported_at: new Date().toISOString(),
      lgpd: lgpdData,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lgpd-export-${user?.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Exportação iniciada",
      description: "Arquivo JSON gerado com os dados pessoais do usuário.",
    });
  };

  return (
    <TabsContent
      value="lgpd"
      className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px] mt-0"
    >
      <div className="space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800">
              Consentimento &amp; Base Legal
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Status:</span>
            {lgpdData?.consent_given ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                ✓ Consentimento dado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                ⚠ Sem consentimento
              </span>
            )}
            {lgpdData?.deletion_requested && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                ⛔ Exclusão solicitada
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Data do consentimento:</span>{" "}
              <span className="font-medium">
                {lgpdData?.consent_date || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Versão:</span>{" "}
              <span className="font-medium">
                {lgpdData?.consent_version || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Retenção até:</span>{" "}
              <span className="font-medium">
                {lgpdData?.data_retention_until || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Exportação solicitada:</span>{" "}
              <span className="font-medium">
                {lgpdData?.data_export_requested
                  ? (lgpdData.data_export_requested_at ?? "Sim")
                  : "Não"}
              </span>
            </div>
          </div>
          <div className="pt-1 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Base legal do tratamento
              </label>
              <select
                className="w-full h-8 rounded-md border border-slate-200 bg-white text-xs px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
              >
                <option value="consent">Consentimento (Art. 7º, I)</option>
                <option value="contract">
                  Execução de contrato (Art. 7º, V)
                </option>
                <option value="legitimate_interest">
                  Legítimo interesse (Art. 7º, IX)
                </option>
                <option value="legal_obligation">
                  Obrigação legal (Art. 7º, II)
                </option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-700">
                Aceita comunicações da plataforma
              </label>
              <Switch checked={commOptIn} onCheckedChange={setCommOptIn} />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              className="text-xs h-8"
              onClick={handleSaveConsent}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Salvar consentimento
            </Button>
          </div>
        </div>

        {/* Finalidades */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-800 mb-3">
            Finalidades de Tratamento
          </h3>
          {purposes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhuma finalidade registrada.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {purposes.map((p: string, i: number) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Histórico de consentimento */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-800 mb-3">
            Histórico de Consentimento
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-400" />
                  <div>
                    <span className="font-medium text-slate-700">
                      {h.action}
                    </span>
                    <span className="text-slate-400 ml-2">
                      {h.date} · v{h.version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Solicitações */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-slate-800">
            Direitos do Titular (LGPD Art. 18)
          </h3>
          <p className="text-xs text-slate-500">
            O usuário pode exercer seus direitos de portabilidade e exclusão a
            qualquer momento.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={handleExportData}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exportar dados (portabilidade)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleRequestDeletion}
              disabled={lgpdData?.deletion_requested || isSaving}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {lgpdData?.deletion_requested
                ? "Exclusão já solicitada"
                : "Solicitar exclusão de dados"}
            </Button>
          </div>
          {lgpdData?.deletion_requested_at && (
            <p className="text-xs text-red-500">
              Solicitação registrada em: {lgpdData.deletion_requested_at}
            </p>
          )}
        </div>

        {/* Política de Privacidade */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-800 mb-2">
            Política de Privacidade
          </h3>
          <a
            href="#"
            className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-700"
            onClick={(e) => e.preventDefault()}
          >
            Ler Política de Privacidade Allka v1.1
          </a>
          <p className="text-xs text-slate-400 mt-1">
            Última atualização: 01/01/2024 · Base legal: LGPD Lei 13.709/2018
          </p>
        </div>
      </div>
    </TabsContent>
  );
}

function DataSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        {children}
      </div>
    </div>
  );
}
