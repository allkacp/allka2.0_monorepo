// @ts-nocheck
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ExportButton } from "@/components/export-button";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  usePlatformUsers,
  MOCK_COMPANIES as PLATFORM_COMPANIES,
} from "@/contexts/platform-users-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Share2,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Tag,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Megaphone,
  Search,
  X,
  Gift,
  UserCheck,
  Star,
  Building2,
  User,
  Link2,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
  FileText,
  FileSpreadsheet,
  FileDown,
  Image,
  UserPlus,
} from "lucide-react";

// Types
type AccountTypeRestriction = "empresas" | "agencias" | "nomades";

interface Campaign {
  id: string;
  name: string;
  campaignType: "referral" | "influencer";
  commissionType: "fixed-first" | "per-referral" | "percentage";
  commissionValue: number;
  minReferrals: number;
  maxReferrals: number;
  activeReferrals: number;
  totalEarned: number;
  status: "active" | "paused" | "ended";
  startDate: string;
  endDate: string;
  linkedCouponId?: string;
  linkedCouponCode?: string;
  linkedUserId?: string;
  linkedUserName?: string;
}

interface Coupon {
  id: string;
  code: string;
  couponType: "discount" | "credit-bonus" | "referral";
  discountType: "percentage" | "fixed";
  discountValue: number;
  creditBonus?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usageLimitPerCompany: "once" | "unlimited" | "custom";
  maxUsesPerCompany: number;
  usedCount: number;
  applicableProducts: string[];
  allowedAccountTypes: AccountTypeRestriction[];
  linkedUserId?: string;
  linkedUserName?: string;
  linkedUserCommissionType?: "percentage" | "fixed";
  linkedUserCommissionValue?: number;
  linkedCampaignId?: string;
  allowedCompanyIds?: string[];
  allowedUserIds?: string[];
  status: "active" | "expired" | "disabled";
}

// Mock platform users
const MOCK_USERS = [
  { id: "u1", name: "Carlos Mendonça", role: "Agência Premium" },
  { id: "u2", name: "Ana Beatriz Silva", role: "Nômade" },
  { id: "u3", name: "Rafael Torres", role: "Agência Elite" },
  { id: "u4", name: "Juliana Costa", role: "Empresa" },
  { id: "u5", name: "Pedro Alves", role: "Agência Basic" },
  { id: "u6", name: "Marcos Lima", role: "Empresa" },
  { id: "u7", name: "Fernanda Rocha", role: "Empresa" },
];

const MOCK_COMPANIES = [
  {
    id: "co1",
    name: "TechBrasil Ltda",
    accountType: "empresas" as AccountTypeRestriction,
    userIds: ["u4", "u6"],
  },
  {
    id: "co2",
    name: "Agência Pixel",
    accountType: "agencias" as AccountTypeRestriction,
    userIds: ["u1", "u5"],
  },
  {
    id: "co3",
    name: "Agência Criativa",
    accountType: "agencias" as AccountTypeRestriction,
    userIds: ["u3"],
  },
  {
    id: "co4",
    name: "Startup Digital",
    accountType: "empresas" as AccountTypeRestriction,
    userIds: ["u7"],
  },
  {
    id: "co5",
    name: "Nomadico Travels",
    accountType: "nomades" as AccountTypeRestriction,
    userIds: ["u2"],
  },
];

const ACCOUNT_TYPE_LABELS: Record<AccountTypeRestriction, string> = {
  empresas: "Empresas",
  agencias: "Agências",
  nomades: "Nômades",
};

// Mock data
const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    name: "Programa de Indicação Básico",
    campaignType: "referral",
    commissionType: "fixed-first",
    commissionValue: 100,
    minReferrals: 1,
    maxReferrals: 10,
    activeReferrals: 45,
    totalEarned: 4500,
    status: "active",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    linkedCouponId: "1",
    linkedCouponCode: "WELCOME20",
  },
  {
    id: "2",
    name: "Indicação Premium",
    campaignType: "referral",
    commissionType: "per-referral",
    commissionValue: 50,
    minReferrals: 1,
    maxReferrals: 50,
    activeReferrals: 123,
    totalEarned: 6150,
    status: "active",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  },
  {
    id: "3",
    name: "Carlos Mendonça — Influencer",
    campaignType: "influencer",
    commissionType: "percentage",
    commissionValue: 10,
    minReferrals: 0,
    maxReferrals: 500,
    activeReferrals: 67,
    totalEarned: 8900,
    status: "active",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    linkedUserId: "u1",
    linkedUserName: "Carlos Mendonça",
    linkedCouponId: "c3",
    linkedCouponCode: "CARLOS10",
  },
  {
    id: "4",
    name: "Campanha Agências Q1 2026",
    campaignType: "referral",
    commissionType: "per-referral",
    commissionValue: 80,
    minReferrals: 3,
    maxReferrals: 100,
    activeReferrals: 31,
    totalEarned: 2480,
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    linkedCouponId: "5",
    linkedCouponCode: "AGENCY25",
  },
  {
    id: "5",
    name: "Rafael Torres — Embaixador",
    campaignType: "influencer",
    commissionType: "percentage",
    commissionValue: 12,
    minReferrals: 0,
    maxReferrals: 200,
    activeReferrals: 88,
    totalEarned: 14320,
    status: "active",
    startDate: "2025-06-01",
    endDate: "2026-06-01",
    linkedUserId: "u3",
    linkedUserName: "Rafael Torres",
    linkedCouponId: "c6",
    linkedCouponCode: "RAFAEL12",
  },
  {
    id: "6",
    name: "Indicação Nômades",
    campaignType: "referral",
    commissionType: "fixed-first",
    commissionValue: 60,
    minReferrals: 1,
    maxReferrals: 30,
    activeReferrals: 19,
    totalEarned: 1140,
    status: "paused",
    startDate: "2025-09-01",
    endDate: "2026-09-01",
    linkedCouponId: "7",
    linkedCouponCode: "NOMAD15",
  },
  {
    id: "7",
    name: "Ana Beatriz — Influencer Nômade",
    campaignType: "influencer",
    commissionType: "percentage",
    commissionValue: 8,
    minReferrals: 0,
    maxReferrals: 150,
    activeReferrals: 42,
    totalEarned: 5980,
    status: "active",
    startDate: "2025-11-01",
    endDate: "2026-11-01",
    linkedUserId: "u2",
    linkedUserName: "Ana Beatriz Silva",
    linkedCouponId: "c8",
    linkedCouponCode: "ANA8OFF",
  },
  {
    id: "8",
    name: "Programa Enterprise 2026",
    campaignType: "referral",
    commissionType: "percentage",
    commissionValue: 15,
    minReferrals: 5,
    maxReferrals: 1000,
    activeReferrals: 204,
    totalEarned: 38700,
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    linkedCouponId: "9",
    linkedCouponCode: "ENT2026",
  },
  {
    id: "9",
    name: "Pedro Alves — Parceiro Agência",
    campaignType: "influencer",
    commissionType: "fixed-first",
    commissionValue: 200,
    minReferrals: 0,
    maxReferrals: 50,
    activeReferrals: 17,
    totalEarned: 3400,
    status: "active",
    startDate: "2026-02-01",
    endDate: "2026-08-01",
    linkedUserId: "u5",
    linkedUserName: "Pedro Alves",
    linkedCouponId: "c10",
    linkedCouponCode: "PEDRO200",
  },
  {
    id: "10",
    name: "Indicação Empresas — Semestral",
    campaignType: "referral",
    commissionType: "per-referral",
    commissionValue: 120,
    minReferrals: 2,
    maxReferrals: 80,
    activeReferrals: 55,
    totalEarned: 6600,
    status: "ended",
    startDate: "2025-01-01",
    endDate: "2025-06-30",
  },
  {
    id: "11",
    name: "Marcos Lima — Indicador VIP",
    campaignType: "influencer",
    commissionType: "percentage",
    commissionValue: 18,
    minReferrals: 0,
    maxReferrals: 300,
    activeReferrals: 136,
    totalEarned: 27890,
    status: "active",
    startDate: "2025-08-01",
    endDate: "2026-08-01",
    linkedUserId: "u6",
    linkedUserName: "Marcos Lima",
    linkedCouponId: "c11",
    linkedCouponCode: "MARCOS18",
  },
  {
    id: "12",
    name: "Fernanda Rocha — Growth Partner",
    campaignType: "influencer",
    commissionType: "percentage",
    commissionValue: 14,
    minReferrals: 0,
    maxReferrals: 200,
    activeReferrals: 73,
    totalEarned: 11200,
    status: "active",
    startDate: "2026-01-15",
    endDate: "2026-07-15",
    linkedUserId: "u7",
    linkedUserName: "Fernanda Rocha",
    linkedCouponId: "c12",
    linkedCouponCode: "FEROCHA14",
  },
  {
    id: "13",
    name: "Campanha Black Friday 2025",
    campaignType: "referral",
    commissionType: "fixed-first",
    commissionValue: 150,
    minReferrals: 1,
    maxReferrals: 500,
    activeReferrals: 389,
    totalEarned: 58350,
    status: "ended",
    startDate: "2025-11-24",
    endDate: "2025-11-30",
    linkedCouponId: "13",
    linkedCouponCode: "BF150",
  },
];

const INITIAL_COUPONS: Coupon[] = [
  {
    id: "1",
    code: "WELCOME20",
    couponType: "discount",
    discountType: "percentage",
    discountValue: 20,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    usageLimit: 1000,
    usageLimitPerCompany: "unlimited",
    maxUsesPerCompany: 0,
    usedCount: 234,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: [],
    status: "active",
  },
  {
    id: "2",
    code: "FIRST50",
    couponType: "discount",
    discountType: "fixed",
    discountValue: 50,
    validFrom: "2024-01-01",
    validUntil: "2024-06-30",
    usageLimit: 500,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 456,
    applicableProducts: ["Primeira compra"],
    allowedAccountTypes: ["empresas", "agencias"],
    status: "active",
  },
  {
    id: "c3",
    code: "CARLOS10",
    couponType: "referral",
    discountType: "percentage",
    discountValue: 10,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    usageLimit: 0,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 67,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: [],
    linkedUserId: "u1",
    linkedUserName: "Carlos Mendonça",
    linkedUserCommissionType: "percentage",
    linkedUserCommissionValue: 10,
    linkedCampaignId: "3",
    status: "active",
  },
  {
    id: "4",
    code: "GROWTH50CR",
    couponType: "credit-bonus",
    discountType: "fixed",
    discountValue: 0,
    creditBonus: 50,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    usageLimit: 0,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 89,
    applicableProducts: ["Plano Growth", "Plano Scale"],
    allowedAccountTypes: ["agencias"],
    status: "active",
  },
  {
    id: "5",
    code: "AGENCY25",
    couponType: "discount",
    discountType: "percentage",
    discountValue: 25,
    validFrom: "2026-01-01",
    validUntil: "2026-03-31",
    usageLimit: 200,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 31,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: ["agencias"],
    allowedCompanyIds: ["co2", "co3"],
    status: "active",
  },
  {
    id: "c6",
    code: "RAFAEL12",
    couponType: "referral",
    discountType: "percentage",
    discountValue: 12,
    validFrom: "2025-06-01",
    validUntil: "2026-06-01",
    usageLimit: 0,
    usageLimitPerCompany: "unlimited",
    maxUsesPerCompany: 0,
    usedCount: 88,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: [],
    linkedUserId: "u3",
    linkedUserName: "Rafael Torres",
    linkedUserCommissionType: "percentage",
    linkedUserCommissionValue: 12,
    linkedCampaignId: "5",
    status: "active",
  },
  {
    id: "7",
    code: "NOMAD15",
    couponType: "discount",
    discountType: "percentage",
    discountValue: 15,
    validFrom: "2025-09-01",
    validUntil: "2026-09-01",
    usageLimit: 100,
    usageLimitPerCompany: "unlimited",
    maxUsesPerCompany: 0,
    usedCount: 19,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: ["nomades"],
    allowedCompanyIds: ["co5"],
    status: "disabled",
  },
  {
    id: "c8",
    code: "ANA8OFF",
    couponType: "referral",
    discountType: "percentage",
    discountValue: 8,
    validFrom: "2025-11-01",
    validUntil: "2026-11-01",
    usageLimit: 0,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 42,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: ["nomades"],
    linkedUserId: "u2",
    linkedUserName: "Ana Beatriz Silva",
    linkedUserCommissionType: "percentage",
    linkedUserCommissionValue: 8,
    linkedCampaignId: "7",
    status: "active",
  },
  {
    id: "9",
    code: "ENT2026",
    couponType: "discount",
    discountType: "percentage",
    discountValue: 30,
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    usageLimit: 50,
    usageLimitPerCompany: "custom",
    maxUsesPerCompany: 5,
    usedCount: 18,
    applicableProducts: ["Plano Scale", "Plano Enterprise"],
    allowedAccountTypes: ["empresas"],
    allowedCompanyIds: ["co1", "co4"],
    status: "active",
  },
  {
    id: "c10",
    code: "PEDRO200",
    couponType: "referral",
    discountType: "fixed",
    discountValue: 200,
    validFrom: "2026-02-01",
    validUntil: "2026-08-01",
    usageLimit: 50,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 17,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: ["agencias"],
    linkedUserId: "u5",
    linkedUserName: "Pedro Alves",
    linkedUserCommissionType: "fixed",
    linkedUserCommissionValue: 200,
    linkedCampaignId: "9",
    status: "active",
  },
  {
    id: "c11",
    code: "MARCOS18",
    couponType: "referral",
    discountType: "percentage",
    discountValue: 18,
    validFrom: "2025-08-01",
    validUntil: "2026-08-01",
    usageLimit: 0,
    usageLimitPerCompany: "unlimited",
    maxUsesPerCompany: 0,
    usedCount: 136,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: [],
    linkedUserId: "u6",
    linkedUserName: "Marcos Lima",
    linkedUserCommissionType: "percentage",
    linkedUserCommissionValue: 18,
    linkedCampaignId: "11",
    status: "active",
  },
  {
    id: "c12",
    code: "FEROCHA14",
    couponType: "referral",
    discountType: "percentage",
    discountValue: 14,
    validFrom: "2026-01-15",
    validUntil: "2026-07-15",
    usageLimit: 0,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 73,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: ["empresas"],
    allowedCompanyIds: ["co1", "co4"],
    linkedUserId: "u7",
    linkedUserName: "Fernanda Rocha",
    linkedUserCommissionType: "percentage",
    linkedUserCommissionValue: 14,
    linkedCampaignId: "12",
    status: "active",
  },
  {
    id: "13",
    code: "BF150",
    couponType: "discount",
    discountType: "fixed",
    discountValue: 150,
    validFrom: "2025-11-24",
    validUntil: "2025-11-30",
    usageLimit: 2000,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 1847,
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: [],
    status: "expired",
  },
  {
    id: "14",
    code: "SCALE100CR",
    couponType: "credit-bonus",
    discountType: "fixed",
    discountValue: 0,
    creditBonus: 100,
    validFrom: "2026-01-01",
    validUntil: "2026-06-30",
    usageLimit: 300,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 112,
    applicableProducts: ["Plano Scale"],
    allowedAccountTypes: ["agencias", "empresas"],
    status: "active",
  },
  {
    id: "15",
    code: "NEWBIZ30",
    couponType: "discount",
    discountType: "percentage",
    discountValue: 30,
    validFrom: "2026-03-01",
    validUntil: "2026-03-31",
    usageLimit: 150,
    usageLimitPerCompany: "once",
    maxUsesPerCompany: 1,
    usedCount: 47,
    applicableProducts: ["Primeira compra"],
    allowedAccountTypes: ["empresas"],
    allowedCompanyIds: ["co1"],
    allowedUserIds: ["u4"],
    status: "active",
  },
  {
    id: "16",
    code: "SQUAD200CR",
    couponType: "credit-bonus",
    discountType: "fixed",
    discountValue: 0,
    creditBonus: 200,
    validFrom: "2026-02-01",
    validUntil: "2026-12-31",
    usageLimit: 0,
    usageLimitPerCompany: "custom",
    maxUsesPerCompany: 3,
    usedCount: 58,
    applicableProducts: ["Plano Squad", "Plano Enterprise"],
    allowedAccountTypes: ["agencias"],
    status: "active",
  },
];

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getCommissionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    "fixed-first": "Fixo na 1ª compra",
    "per-referral": "Por indicação ativa",
    percentage: "% sobre vendas",
  };
  return labels[type] ?? type;
};

const getCouponTypeConfig = (type: string) => {
  const configs: Record<string, { label: string; icon: any; color: string }> = {
    discount: {
      label: "Desconto",
      icon: Tag,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    "credit-bonus": {
      label: "Bônus de Crédito",
      icon: Gift,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    referral: {
      label: "Afiliado",
      icon: UserCheck,
      color: "bg-violet-50 text-violet-700 border-violet-200",
    },
  };
  return configs[type] || configs.discount;
};

export default function CampanhasPage() {
  const { toast } = useToast();
  const { sidebarSettings, sidebarWidth } = useSidebar();
  const { users: platformUsers } = usePlatformUsers();
  const pageRef = useRef<HTMLDivElement>(null);

  const [listFilter, setListFilter] = useState<
    "all" | "campaigns" | "coupons" | "influencers"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    period: "month" as "today" | "week" | "month" | "quarter" | "custom",
    dateFrom: "",
    dateTo: "",
    reportType: "all" as "all" | "campaigns" | "coupons" | "influencers",
    statusFilter: "all" as string,
    accountType: "all" as string,
    metricFocus: "all" as "all" | "clicks" | "conversions" | "abandonment",
  });
  const reportPageRef = useRef<HTMLDivElement>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const emptyAdvFilters = {
    statuses: [] as string[],
    types: [] as string[],
    commissionTypes: [] as string[],
    dateFrom: "",
    dateTo: "",
  };
  const [advancedFilters, setAdvancedFilters] = useState(emptyAdvFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyAdvFilters);
  const [savedFilters, setSavedFilters] = useState<
    { id: string; name: string; filters: typeof emptyAdvFilters }[]
  >([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const activeFilterCount = [
    appliedFilters.statuses.length > 0,
    appliedFilters.types.length > 0,
    appliedFilters.commissionTypes.length > 0,
    !!appliedFilters.dateFrom || !!appliedFilters.dateTo,
  ].filter(Boolean).length;

  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    campaignType: "referral" as Campaign["campaignType"],
    commissionType: "fixed-first" as Campaign["commissionType"],
    commissionValue: 0,
    minReferrals: 1,
    maxReferrals: 10,
    startDate: "",
    endDate: "",
    linkedCouponId: "",
    linkedCouponCode: "",
    linkedUserId: "",
    linkedUserName: "",
  });
  const [campaignToggle, setCampaignToggle] = useState<{
    campaign: Campaign | null;
    newStatus: boolean;
  }>({ campaign: null, newStatus: false });

  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToggle, setCouponToggle] = useState<{
    coupon: Coupon | null;
    newStatus: boolean;
  }>({ coupon: null, newStatus: false });
  const [accessDrawerOpen, setAccessDrawerOpen] = useState(false);
  const [accessDrawerCampaign, setAccessDrawerCampaign] =
    useState<Campaign | null>(null);
  const [accessForm, setAccessForm] = useState({
    name: "",
    email: "",
    password: "",
    pixKey: "",
    pixKeyType: "cpf" as "cpf" | "cnpj" | "email" | "phone" | "random",
  });
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    couponType: "discount" as Coupon["couponType"],
    discountType: "percentage" as Coupon["discountType"],
    discountValue: 0,
    creditBonus: 0,
    usageLimit: 1000,
    usageLimitPerCompany: "unlimited" as Coupon["usageLimitPerCompany"],
    maxUsesPerCompany: 0,
    validFrom: "",
    validUntil: "",
    applicableProducts: ["Todos os produtos"],
    allowedAccountTypes: [] as AccountTypeRestriction[],
    allowedCompanyIds: [] as string[],
    allowedUserIds: [] as string[],
    restrictionMode: "none" as "none" | "company" | "user",
    linkedUserId: "",
    linkedUserName: "",
    linkedUserCommissionType: "percentage" as "percentage" | "fixed",
    linkedUserCommissionValue: 0,
  });

  // Stats
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const activeCoupons = coupons.filter((c) => c.status === "active").length;
  const totalReferrals = campaigns.reduce((s, c) => s + c.activeReferrals, 0);
  const totalCouponUses = coupons.reduce((s, c) => s + c.usedCount, 0);
  const totalInvested = campaigns.reduce((s, c) => s + c.totalEarned, 0);

  // Filtered lists
  const filteredCampaigns = campaigns.filter((c) => {
    if (
      searchQuery &&
      !c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (
      appliedFilters.statuses.length > 0 &&
      !appliedFilters.statuses.includes(c.status)
    )
      return false;
    if (appliedFilters.types.length > 0) {
      const typeMatch =
        (appliedFilters.types.includes("referral") &&
          c.campaignType === "referral") ||
        (appliedFilters.types.includes("influencer") &&
          c.campaignType === "influencer");
      if (!typeMatch) return false;
    }
    if (
      appliedFilters.commissionTypes.length > 0 &&
      !appliedFilters.commissionTypes.includes(c.commissionType)
    )
      return false;
    if (appliedFilters.dateFrom && c.endDate < appliedFilters.dateFrom)
      return false;
    if (appliedFilters.dateTo && c.startDate > appliedFilters.dateTo)
      return false;
    if (listFilter === "campaigns") return true;
    if (listFilter === "influencers") return c.campaignType === "influencer";
    if (listFilter === "coupons") return false;
    return true;
  });
  const filteredCoupons = coupons.filter((c) => {
    if (
      searchQuery &&
      !c.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (
      appliedFilters.statuses.length > 0 &&
      !appliedFilters.statuses.includes(c.status)
    )
      return false;
    if (appliedFilters.types.length > 0) {
      const typeMatch =
        (appliedFilters.types.includes("discount") &&
          c.couponType === "discount") ||
        (appliedFilters.types.includes("referral-coupon") &&
          c.couponType === "referral") ||
        (appliedFilters.types.includes("credit-bonus") &&
          c.couponType === "credit-bonus");
      if (!typeMatch) return false;
    }
    if (appliedFilters.dateFrom && c.validUntil < appliedFilters.dateFrom)
      return false;
    if (appliedFilters.dateTo && c.validFrom > appliedFilters.dateTo)
      return false;
    if (listFilter === "coupons") return true;
    if (listFilter === "influencers") return c.couponType === "referral";
    if (listFilter === "campaigns") return false;
    return true;
  });

  // Campaign handlers
  const openNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm({
      name: "",
      campaignType: "referral",
      commissionType: "fixed-first",
      commissionValue: 0,
      minReferrals: 1,
      maxReferrals: 10,
      startDate: "",
      endDate: "",
      linkedCouponId: "",
      linkedCouponCode: "",
      linkedUserId: "",
      linkedUserName: "",
    });
    setCampaignDialogOpen(true);
  };
  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c);
    setCampaignForm({
      name: c.name,
      campaignType: c.campaignType,
      commissionType: c.commissionType,
      commissionValue: c.commissionValue,
      minReferrals: c.minReferrals,
      maxReferrals: c.maxReferrals,
      startDate: c.startDate,
      endDate: c.endDate,
      linkedCouponId: c.linkedCouponId || "",
      linkedCouponCode: c.linkedCouponCode || "",
      linkedUserId: c.linkedUserId || "",
      linkedUserName: c.linkedUserName || "",
    });
    setCampaignDialogOpen(true);
  };
  const closeCampaignDialog = () => {
    setCampaignDialogOpen(false);
    setEditingCampaign(null);
  };
  const saveCampaign = () => {
    const linkedCoupon = coupons.find(
      (c) => c.id === campaignForm.linkedCouponId,
    );
    const data = {
      ...campaignForm,
      linkedCouponCode: linkedCoupon?.code || campaignForm.linkedCouponCode,
    };
    if (editingCampaign) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === editingCampaign.id ? { ...c, ...data } : c)),
      );
      toast({
        title: "Sucesso",
        description: "Campanha atualizada com sucesso",
      });
    } else {
      setCampaigns((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          ...data,
          activeReferrals: 0,
          totalEarned: 0,
          status: "active",
        },
      ]);
      toast({ title: "Sucesso", description: "Campanha criada com sucesso" });
    }
    closeCampaignDialog();
  };
  const deleteCampaign = (id: string) =>
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  const confirmCampaignToggle = () => {
    if (!campaignToggle.campaign) return;
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignToggle.campaign!.id
          ? { ...c, status: campaignToggle.newStatus ? "active" : "paused" }
          : c,
      ),
    );
    toast({
      title: "Sucesso",
      description: `Campanha ${campaignToggle.newStatus ? "ativada" : "desativada"} com sucesso`,
    });
    setCampaignToggle({ campaign: null, newStatus: false });
  };

  // Coupon handlers
  const openNewCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: "",
      couponType: "discount",
      discountType: "percentage",
      discountValue: 0,
      creditBonus: 0,
      usageLimit: 1000,
      usageLimitPerCompany: "unlimited",
      maxUsesPerCompany: 0,
      validFrom: "",
      validUntil: "",
      applicableProducts: ["Todos os produtos"],
      allowedAccountTypes: [],
      allowedCompanyIds: [],
      allowedUserIds: [],
      restrictionMode: "none",
      linkedUserId: "",
      linkedUserName: "",
      linkedUserCommissionType: "percentage",
      linkedUserCommissionValue: 0,
    });
    setCouponDialogOpen(true);
  };
  const openEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code,
      couponType: c.couponType,
      discountType: c.discountType,
      discountValue: c.discountValue,
      creditBonus: c.creditBonus || 0,
      usageLimit: c.usageLimit,
      usageLimitPerCompany: c.usageLimitPerCompany,
      maxUsesPerCompany: c.maxUsesPerCompany,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      applicableProducts: c.applicableProducts,
      allowedAccountTypes: c.allowedAccountTypes || [],
      allowedCompanyIds: c.allowedCompanyIds || [],
      allowedUserIds: c.allowedUserIds || [],
      restrictionMode:
        (c.allowedCompanyIds?.length ?? 0) > 0
          ? "company"
          : (c.allowedUserIds?.length ?? 0) > 0
            ? "user"
            : "none",
      linkedUserId: c.linkedUserId || "",
      linkedUserName: c.linkedUserName || "",
      linkedUserCommissionType: c.linkedUserCommissionType || "percentage",
      linkedUserCommissionValue: c.linkedUserCommissionValue || 0,
    });
    setCouponDialogOpen(true);
  };
  const saveCoupon = () => {
    const user = MOCK_USERS.find((u) => u.id === couponForm.linkedUserId);
    const data = {
      ...couponForm,
      linkedUserName: user?.name || couponForm.linkedUserName,
    };
    if (editingCoupon) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === editingCoupon.id ? { ...c, ...data } : c)),
      );
      toast({ title: "Sucesso", description: "Cupom atualizado com sucesso" });
    } else {
      setCoupons((prev) => [
        ...prev,
        { id: String(Date.now()), ...data, usedCount: 0, status: "active" },
      ]);
      toast({ title: "Sucesso", description: "Cupom criado com sucesso" });
    }
    setCouponDialogOpen(false);
    setEditingCoupon(null);
  };
  const deleteCoupon = (id: string) =>
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  const confirmCouponToggle = () => {
    if (!couponToggle.coupon) return;
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === couponToggle.coupon!.id
          ? { ...c, status: couponToggle.newStatus ? "active" : "disabled" }
          : c,
      ),
    );
    toast({
      title: "Sucesso",
      description: `Cupom ${couponToggle.newStatus ? "ativado" : "desativado"} com sucesso`,
    });
    setCouponToggle({ coupon: null, newStatus: false });
  };

  // Sidebar gradient
  const getSidebarGradient = () => {
    const bg = sidebarSettings?.backgroundColor || "";
    if (!bg || bg === "bg-slate-900")
      return "linear-gradient(to bottom, #000000 0%, #0a1628 8%, #1a2f5a 20%, #2563eb 40%, #3b82f6 60%, #2563eb 80%, #1a2f5a 92%, #0a1628 100%)";
    if (bg.startsWith("custom-gradient:"))
      return bg.replace("custom-gradient:", "");
    if (bg.includes("gradient")) {
      const gradientMap: Record<string, string> = {
        "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900":
          "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
        "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900":
          "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
        "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800":
          "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
        "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900":
          "linear-gradient(to bottom right, #14532d, #065f46, #134e4a)",
        "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900":
          "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
      };
      return (
        gradientMap[bg] ||
        "linear-gradient(to bottom, #000000 0%, #0a1628 8%, #1a2f5a 20%, #2563eb 40%, #3b82f6 60%)"
      );
    }
    return "linear-gradient(to bottom, #000000 0%, #0a1628 8%, #1a2f5a 20%, #2563eb 40%, #3b82f6 60%, #2563eb 80%, #1a2f5a 92%, #0a1628 100%)";
  };
  const headerGradient = getSidebarGradient();

  const influencerCount =
    campaigns.filter((c) => c.campaignType === "influencer").length +
    coupons.filter((c) => c.couponType === "referral").length;
  const filterButtons = [
    { key: "all", label: "Tudo", count: campaigns.length + coupons.length },
    { key: "campaigns", label: "Campanhas", count: campaigns.length },
    { key: "coupons", label: "Cupons", count: coupons.length },
    { key: "influencers", label: "Influencers", count: influencerCount },
  ];

  const allFilteredItems = [
    ...filteredCampaigns.map((c) => ({ type: "campaign" as const, item: c })),
    ...filteredCoupons.map((c) => ({ type: "coupon" as const, item: c })),
  ];
  const totalFilteredItems = allFilteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const pagedItems = allFilteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pagedCampaigns = pagedItems
    .filter((x) => x.type === "campaign")
    .map((x) => x.item as Campaign);
  const pagedCoupons = pagedItems
    .filter((x) => x.type === "coupon")
    .map((x) => x.item as Coupon);
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  // ── Report helpers ────────────────────────────────────────────────
  const getReportMetrics = (id: string, count: number) => {
    const seed = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const mult = 2 + (seed % 5);
    const clicks = Math.max(count * mult, count + 3);
    const conversions = count;
    const abandonment = clicks - conversions;
    const rate = clicks > 0 ? Math.round((conversions / clicks) * 100) : 0;
    return { clicks, conversions, abandonment, rate };
  };

  const reportCampaignItems = campaigns
    .filter((c) => {
      if (
        reportFilters.statusFilter !== "all" &&
        c.status !== reportFilters.statusFilter
      )
        return false;
      if (reportFilters.reportType === "coupons") return false;
      if (reportFilters.reportType === "influencers")
        return c.campaignType === "influencer";
      if (reportFilters.reportType === "campaigns") return true;
      return true;
    })
    .map((c) => {
      const { clicks, conversions, abandonment, rate } = getReportMetrics(
        c.id,
        c.activeReferrals,
      );
      const revenue =
        c.commissionType === "percentage"
          ? c.activeReferrals * 180
          : c.activeReferrals * 160;
      return {
        id: c.id,
        name: c.name,
        kind: c.campaignType === "influencer" ? "Influencer" : "Campanha",
        status: c.status,
        accountType: "—",
        clicks,
        conversions,
        abandonment,
        rate,
        revenue,
        commission: c.totalEarned,
      };
    });

  const reportCouponItems = coupons
    .filter((c) => {
      if (
        reportFilters.statusFilter !== "all" &&
        c.status !== reportFilters.statusFilter
      )
        return false;
      if (
        reportFilters.reportType === "campaigns" ||
        reportFilters.reportType === "influencers"
      )
        return false;
      return true;
    })
    .filter((c) => {
      if (reportFilters.accountType === "all") return true;
      return (
        (c.allowedAccountTypes ?? []).length === 0 ||
        (c.allowedAccountTypes ?? []).includes(reportFilters.accountType)
      );
    })
    .map((c) => {
      const { clicks, conversions, abandonment, rate } = getReportMetrics(
        c.id,
        c.usedCount,
      );
      const revenue =
        c.usedCount * (c.couponType === "credit-bonus" ? 70 : 130);
      const commission =
        c.couponType === "referral"
          ? c.usedCount * (c.commissionValue || 0)
          : 0;
      const typeLabel =
        c.couponType === "referral"
          ? "Afiliado"
          : c.couponType === "credit-bonus"
            ? "Crédito"
            : "Desconto";
      const acctLabel =
        (c.allowedAccountTypes ?? []).length === 0
          ? "Todos"
          : c.allowedAccountTypes
              .map((t: string) =>
                t === "empresas" ? "Emp." : t === "agencias" ? "Ag." : "Nôm.",
              )
              .join(", ");
      return {
        id: c.id,
        name: c.code,
        kind: typeLabel,
        status: c.status,
        accountType: acctLabel,
        clicks,
        conversions,
        abandonment,
        rate,
        revenue,
        commission,
      };
    });

  const reportItems = [...reportCampaignItems, ...reportCouponItems];
  const rTotalClicks = reportItems.reduce((s, i) => s + i.clicks, 0);
  const rTotalConversions = reportItems.reduce((s, i) => s + i.conversions, 0);
  const rTotalAbandonment = reportItems.reduce((s, i) => s + i.abandonment, 0);
  const rAvgRate =
    rTotalClicks > 0 ? Math.round((rTotalConversions / rTotalClicks) * 100) : 0;
  const rTotalRevenue = reportItems.reduce((s, i) => s + i.revenue, 0);
  const rTotalCommission = reportItems.reduce((s, i) => s + i.commission, 0);

  const exportReportDate = () => new Date().toISOString().split("T")[0];

  const exportReportAsCsv = () => {
    const headers = [
      "Nome/Código",
      "Tipo",
      "Status",
      "Tipo de Conta",
      "Cliques",
      "Usos/Referências",
      "Conversões",
      "Abandono",
      "Taxa Conv.%",
      "Receita (R$)",
      "Comissão (R$)",
    ];
    const rows = reportItems.map((i) => [
      i.name,
      i.kind,
      i.status,
      i.accountType,
      i.clicks,
      i.conversions,
      i.conversions,
      i.abandonment,
      i.rate,
      i.revenue.toFixed(2),
      i.commission.toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-campanhas_${exportReportDate()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado como CSV" });
  };

  const exportReportAsDoc = () => {
    const el = reportPageRef.current;
    if (!el) return;
    const html =
      `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"><title>Relatorio Campanhas</title>` +
      `<style>body{font-family:Calibri,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px;font-size:10pt}</style>` +
      `</head><body>${el.innerHTML}</body></html>`;
    const blob = new Blob([html], {
      type: "application/msword;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-campanhas_${exportReportDate()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado como DOC" });
  };

  const exportReportAsPdf = async () => {
    const el = reportPageRef.current;
    if (!el) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const win = window.open("", "_blank");
      if (!win) {
        toast({
          title: "Popup bloqueado. Libere popups para exportar PDF.",
          variant: "destructive",
        });
        return;
      }
      win.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatorio</title><style>@page{margin:10mm}body{margin:0}img{max-width:100%;display:block}</style></head><body><img src="${dataUrl}"/></body></html>`,
      );
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 600);
      toast({ title: "Abrindo impressão — salve como PDF" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  const exportReportAsPng = async () => {
    const el = reportPageRef.current;
    if (!el) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.download = `relatorio-campanhas_${exportReportDate()}.png`;
      a.href = dataUrl;
      a.click();
      toast({ title: "Relatório exportado como PNG" });
    } catch {
      toast({ title: "Erro ao exportar PNG", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5" ref={pageRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Campanhas e Promoções
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie campanhas de indicação, cupons de desconto e ações
            promocionais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            pageRef={pageRef}
            filename="campanhas"
            onlyImageFormats
          />
          <Button
            onClick={() => setReportOpen(true)}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs px-2.5 font-medium border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
          >
            <BarChart2 className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-slate-600">Relatório</span>
          </Button>
          <Button
            onClick={openNewCoupon}
            className="h-9 gap-2 btn-brand shadow-md border-0"
          >
            <Plus className="h-4 w-4" />
            Novo Cupom
          </Button>
          <Button
            onClick={openNewCampaign}
            className="h-9 gap-2 btn-brand shadow-md border-0"
          >
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-linear-to-br from-blue-500 to-blue-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Campanhas Ativas
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {activeCampaigns + activeCoupons}
          </p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-linear-to-br from-emerald-500 to-teal-600 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Indicações Ativas
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <Users className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {totalReferrals}
          </p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-linear-to-br from-violet-500 to-purple-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Usos de Cupons
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <Tag className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {totalCouponUses}
          </p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-linear-to-br from-orange-500 to-rose-600 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Total Investido
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            R$ {totalInvested.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Unified list */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
          {/* Search */}
          <div className="relative w-52 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {filterButtons.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setListFilter(f.key as any);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  listFilter === f.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {f.label}
                <span
                  className={`text-[9px] px-1 py-0 rounded-full font-bold ${listFilter === f.key ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          {/* Items per page + count */}
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
              de{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {totalFilteredItems}
              </span>{" "}
              {totalFilteredItems === 1 ? "item" : "itens"}
            </span>
          </div>
          {/* Filter Button */}
          <Button
            onClick={() => {
              setAdvancedFilters(appliedFilters);
              setIsFilterModalOpen(true);
            }}
            variant="outline"
            size="sm"
            className={`h-9 gap-2 px-3.5 text-xs border-slate-200 dark:border-slate-700 flex-shrink-0 ${
              activeFilterCount > 0
                ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
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

        {/* Campaigns section */}
        {pagedCampaigns.length > 0 && (
          <>
            {listFilter === "all" && (
              <div className="px-5 py-2 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="h-3 w-3" />
                  Campanhas
                </span>
              </div>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedCampaigns.map((campaign, idx) => (
                <div
                  key={campaign.id}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group ${idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-100 dark:bg-slate-800/20"}`}
                >
                  <div
                    className={`w-1.5 h-10 rounded-full shrink-0 ${campaign.status === "active" ? "bg-emerald-500" : campaign.status === "ended" ? "bg-slate-300" : "bg-amber-400"}`}
                  />
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/30">
                    {campaign.campaignType === "influencer" ? (
                      <Star className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {campaign.name}
                      </p>
                      {campaign.campaignType === "influencer" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                          <Star className="h-3 w-3" />
                          Influencer
                        </span>
                      )}
                      {campaign.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Ativa
                        </span>
                      ) : campaign.status === "ended" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                          <XCircle className="h-3 w-3" />
                          Encerrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                          <XCircle className="h-3 w-3" />
                          Pausada
                        </span>
                      )}
                      {campaign.linkedCouponCode && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-mono">
                          <Tag className="h-3 w-3" />
                          {campaign.linkedCouponCode}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {getCommissionTypeLabel(campaign.commissionType)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {campaign.commissionType === "percentage"
                          ? `${campaign.commissionValue}%`
                          : `R$ ${campaign.commissionValue}`}{" "}
                        comissão
                      </span>
                      {campaign.linkedUserName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {campaign.linkedUserName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.activeReferrals} indicações
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        R$ {campaign.totalEarned.toLocaleString()} pagos
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        até {formatDate(campaign.endDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Switch
                      checked={campaign.status === "active"}
                      onCheckedChange={(checked) =>
                        setCampaignToggle({ campaign, newStatus: checked })
                      }
                      disabled={campaign.status === "ended"}
                      className="data-[state=checked]:bg-emerald-500 scale-75"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCampaign(campaign)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {campaign.campaignType === "influencer" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAccessDrawerCampaign(campaign);
                          setAccessForm({
                            name: campaign.linkedUserName ?? "",
                            email: "",
                            password: "",
                            pixKey: "",
                            pixKeyType: "cpf",
                          });
                          setAccessDrawerOpen(true);
                        }}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                        title="Criar acesso parceiro"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Coupons section */}
        {pagedCoupons.length > 0 && (
          <>
            {listFilter === "all" && (
              <div className="px-5 py-2 bg-slate-50/40 dark:bg-slate-900/20 border-y border-slate-100 dark:border-slate-800/50">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Cupons e Promoções
                </span>
              </div>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedCoupons.map((coupon, idx) => {
                const typeConfig = getCouponTypeConfig(coupon.couponType);
                const TypeIcon = typeConfig.icon;
                return (
                  <div
                    key={coupon.id}
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group ${idx % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-100 dark:bg-slate-800/20"}`}
                  >
                    <div
                      className={`w-1.5 h-10 rounded-full shrink-0 ${coupon.status === "active" ? "bg-emerald-500" : coupon.status === "expired" ? "bg-slate-300" : "bg-rose-400"}`}
                    />
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-900/30">
                      <TypeIcon className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                          {coupon.code}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${typeConfig.color}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </span>
                        {coupon.couponType === "credit-bonus" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            <Gift className="h-3 w-3" />
                            {coupon.creditBonus} créditos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {coupon.discountType === "percentage" ? (
                              <>
                                <Percent className="h-3 w-3" />
                                {coupon.discountValue}% OFF
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-3 w-3" />
                                R$ {coupon.discountValue} OFF
                              </>
                            )}
                          </span>
                        )}
                        {coupon.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        ) : coupon.status === "expired" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            <Clock className="h-3 w-3" />
                            Expirado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                            <XCircle className="h-3 w-3" />
                            Desativado
                          </span>
                        )}
                        {coupon.allowedAccountTypes.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                            <Building2 className="h-3 w-3" />
                            {coupon.allowedAccountTypes
                              .map((t) => ACCOUNT_TYPE_LABELS[t])
                              .join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(coupon.validFrom).toLocaleDateString(
                            "pt-BR",
                          )}{" "}
                          —{" "}
                          {new Date(coupon.validUntil).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                        {coupon.usageLimit > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {coupon.usedCount} / {coupon.usageLimit} usos
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {coupon.usageLimitPerCompany === "once"
                            ? "1x por empresa"
                            : coupon.usageLimitPerCompany === "custom"
                              ? `${coupon.maxUsesPerCompany}x por empresa`
                              : "Ilimitado por empresa"}
                        </span>
                        {coupon.linkedUserName && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {coupon.linkedUserName} ·{" "}
                            {coupon.linkedUserCommissionType === "percentage"
                              ? `${coupon.linkedUserCommissionValue}%`
                              : `R$ ${coupon.linkedUserCommissionValue}`}{" "}
                            comissão
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {coupon.applicableProducts.join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Switch
                        checked={coupon.status === "active"}
                        onCheckedChange={(checked) =>
                          setCouponToggle({ coupon, newStatus: checked })
                        }
                        className="data-[state=checked]:bg-emerald-500 scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCoupon(coupon)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCoupon(coupon.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state */}
        {totalFilteredItems === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              Nenhum item encontrado
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Ajuste os filtros ou crie um novo item
            </p>
          </div>
        )}

        {/* Bottom pagination */}
        {totalFilteredItems > 0 && (
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
              <span className="text-xs text-slate-400 whitespace-nowrap">
                de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {totalFilteredItems}
                </span>{" "}
                {totalFilteredItems === 1 ? "item" : "itens"}
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
        )}
      </Card>

      {/* ── Campaign Drawer ──────────────────────────────────────── */}
      {campaignDialogOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeCampaignDialog}
        />
      )}
      <div
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
        className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-950 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700 overflow-hidden ${
          campaignDialogOpen
            ? "translate-x-0 opacity-100 transition-[transform,opacity] duration-[560ms] ease-[cubic-bezier(0.2,0,0,1)]"
            : "translate-x-full opacity-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none"
        }`}
      >
        <div
          className="px-6 pt-5 pb-6 relative"
          style={{ background: headerGradient }}
        >
          <button
            onClick={closeCampaignDialog}
            className="absolute top-3.5 right-3.5 text-white/60 hover:text-white hover:bg-white/15 rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
              {campaignForm.campaignType === "influencer" ? (
                <Star className="h-5 w-5 text-white" />
              ) : (
                <Share2 className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-white text-base font-semibold leading-tight">
                {editingCampaign ? "Editar Campanha" : "Nova Campanha"}
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                Configure os parâmetros, comissões e vínculos da campanha
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                key: "referral",
                label: "Indicação",
                sub: "Comissão por indicados",
                Icon: Share2,
                active: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
                iconBg: "bg-blue-500",
                textColor: "text-blue-700 dark:text-blue-400",
              },
              {
                key: "influencer",
                label: "Influencer / Afiliado",
                sub: "Vinculado a um usuário",
                Icon: Star,
                active: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
                iconBg: "bg-violet-500",
                textColor: "text-violet-700 dark:text-violet-400",
              },
            ].map((t) => {
              const isActive = campaignForm.campaignType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() =>
                    setCampaignForm({
                      ...campaignForm,
                      campaignType: t.key as Campaign["campaignType"],
                    })
                  }
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${isActive ? t.active : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                >
                  <div
                    className={`rounded-lg p-1.5 shrink-0 ${isActive ? t.iconBg : "bg-slate-200 dark:bg-slate-700"}`}
                  >
                    <t.Icon
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold leading-tight ${isActive ? t.textColor : "text-slate-700 dark:text-slate-300"}`}
                    >
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-400">{t.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Nome da Campanha
            </Label>
            <Input
              placeholder="Ex: Programa de Indicação Premium"
              value={campaignForm.name}
              onChange={(e) =>
                setCampaignForm({ ...campaignForm, name: e.target.value })
              }
              className="h-9 text-sm"
            />
          </div>

          {/* Influencer user link */}
          {campaignForm.campaignType === "influencer" && (
            <div className="space-y-2 p-3.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <Label className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Usuário Vinculado
              </Label>
              <Select
                value={campaignForm.linkedUserId || "none"}
                onValueChange={(v) => {
                  const user = MOCK_USERS.find((u) => u.id === v);
                  setCampaignForm({
                    ...campaignForm,
                    linkedUserId: v === "none" ? "" : v,
                    linkedUserName: user?.name || "",
                  });
                }}
              >
                <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Selecionar usuário..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {MOCK_USERS.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Tipo de Comissão
              </Label>
              <Select
                value={campaignForm.commissionType}
                onValueChange={(v: Campaign["commissionType"]) =>
                  setCampaignForm({ ...campaignForm, commissionType: v })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed-first">Fixo na 1ª compra</SelectItem>
                  <SelectItem value="per-referral">
                    Por indicação ativa
                  </SelectItem>
                  <SelectItem value="percentage">% sobre vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Valor{" "}
                {campaignForm.commissionType === "percentage" ? "(%)" : "(R$)"}
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={campaignForm.commissionValue || ""}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    commissionValue: Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Mín. Indicações
              </Label>
              <Input
                type="number"
                min={0}
                value={campaignForm.minReferrals}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    minReferrals: Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Máx. Indicações
              </Label>
              <Input
                type="number"
                min={1}
                value={campaignForm.maxReferrals}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    maxReferrals: Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Data de Início
              </Label>
              <Input
                type="date"
                value={campaignForm.startDate}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    startDate: e.target.value,
                  })
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Data de Término
              </Label>
              <Input
                type="date"
                value={campaignForm.endDate}
                onChange={(e) =>
                  setCampaignForm({
                    ...campaignForm,
                    endDate: e.target.value,
                  })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Linked coupon */}
          <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Cupom de Desconto Vinculado
              <span className="normal-case font-normal text-slate-400">
                (opcional — incentivo para o indicado)
              </span>
            </Label>
            <Select
              value={campaignForm.linkedCouponId || "none"}
              onValueChange={(v) => {
                const c = coupons.find((x) => x.id === v);
                setCampaignForm({
                  ...campaignForm,
                  linkedCouponId: v === "none" ? "" : v,
                  linkedCouponCode: c?.code || "",
                });
              }}
            >
              <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800">
                <SelectValue placeholder="Selecionar cupom..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {coupons
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} —{" "}
                      {c.couponType === "credit-bonus"
                        ? `${c.creditBonus} créditos`
                        : `${c.discountType === "percentage" ? c.discountValue + "%" : "R$ " + c.discountValue} OFF`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {campaignForm.linkedCouponCode && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Tag className="h-3 w-3 shrink-0" />O código{" "}
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300 mx-1">
                  {campaignForm.linkedCouponCode}
                </span>{" "}
                será disponibilizado para quem for indicado
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/60 dark:bg-slate-900/40 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={closeCampaignDialog}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-9 btn-brand gap-1.5"
            onClick={saveCampaign}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {editingCampaign ? "Salvar Alterações" : "Criar Campanha"}
          </Button>
        </div>
      </div>

      {/* ── Coupon Drawer ────────────────────────────────────────── */}
      {couponDialogOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => {
            setCouponDialogOpen(false);
            setEditingCoupon(null);
            setCompanySearchQuery("");
            setUserSearchQuery("");
            setCompanyPickerOpen(false);
            setUserPickerOpen(false);
          }}
        />
      )}
      <div
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
        className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-950 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700 overflow-hidden ${
          couponDialogOpen
            ? "translate-x-0 opacity-100 transition-[transform,opacity] duration-[560ms] ease-[cubic-bezier(0.2,0,0,1)]"
            : "translate-x-full opacity-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none"
        }`}
      >
        <div
          className="px-6 pt-5 pb-6 relative"
          style={{ background: headerGradient }}
        >
          <button
            onClick={() => {
              setCouponDialogOpen(false);
              setEditingCoupon(null);
            }}
            className="absolute top-3.5 right-3.5 text-white/60 hover:text-white hover:bg-white/15 rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
              {couponForm.couponType === "credit-bonus" ? (
                <Gift className="h-5 w-5 text-white" />
              ) : couponForm.couponType === "referral" ? (
                <UserCheck className="h-5 w-5 text-white" />
              ) : (
                <Tag className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-white text-base font-semibold leading-tight">
                {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                Configure o tipo, código, restrições e regras de uso
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
          {/* Coupon type selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                key: "discount",
                label: "Desconto",
                sub: "% ou R$ OFF",
                Icon: Tag,
                active: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
                iconBg: "bg-blue-500",
                textColor: "text-blue-700 dark:text-blue-400",
              },
              {
                key: "credit-bonus",
                label: "Bônus Crédito",
                sub: "Ao contratar plano",
                Icon: Gift,
                active: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
                iconBg: "bg-amber-500",
                textColor: "text-amber-700 dark:text-amber-400",
              },
              {
                key: "referral",
                label: "Afiliado",
                sub: "Com comissão",
                Icon: UserCheck,
                active: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
                iconBg: "bg-violet-500",
                textColor: "text-violet-700 dark:text-violet-400",
              },
            ].map((t) => {
              const isActive = couponForm.couponType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() =>
                    setCouponForm({
                      ...couponForm,
                      couponType: t.key as Coupon["couponType"],
                    })
                  }
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${isActive ? t.active : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                >
                  <div
                    className={`rounded-lg p-1.5 shrink-0 ${isActive ? t.iconBg : "bg-slate-200 dark:bg-slate-700"}`}
                  >
                    <t.Icon
                      className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold leading-tight ${isActive ? t.textColor : "text-slate-700 dark:text-slate-300"}`}
                    >
                      {t.label}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {t.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Código do Cupom
              </Label>
              <Input
                placeholder="Ex: WELCOME20"
                value={couponForm.code}
                onChange={(e) =>
                  setCouponForm({
                    ...couponForm,
                    code: e.target.value.toUpperCase(),
                  })
                }
                className="h-9 text-sm font-mono tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              {couponForm.couponType === "credit-bonus" ? (
                <>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Créditos Bônus
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="50"
                    value={couponForm.creditBonus || ""}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        creditBonus: Number(e.target.value),
                      })
                    }
                    className="h-9 text-sm"
                  />
                </>
              ) : (
                <>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Tipo de Desconto
                  </Label>
                  <Select
                    value={couponForm.discountType}
                    onValueChange={(v: Coupon["discountType"]) =>
                      setCouponForm({ ...couponForm, discountType: v })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        Porcentagem (%)
                      </SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          {couponForm.couponType !== "credit-bonus" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Desconto{" "}
                  {couponForm.discountType === "percentage" ? "(%)" : "(R$)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={couponForm.discountValue || ""}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      discountValue: Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Limite Global de Uso
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0 = ilimitado"
                  value={couponForm.usageLimit || ""}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      usageLimit: Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Applicable products / plans */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {couponForm.couponType === "credit-bonus"
                ? "Aplicável ao Contratar"
                : "Aplicável a"}
            </Label>
            {couponForm.couponType === "credit-bonus" ? (
              <Select
                value={
                  couponForm.applicableProducts[0] === "Todos os planos"
                    ? "all-plans"
                    : couponForm.applicableProducts[0]?.startsWith("Plano")
                      ? couponForm.applicableProducts[0]
                          .toLowerCase()
                          .replace("plano ", "")
                      : "all-plans"
                }
                onValueChange={(v) => {
                  const map: Record<string, string[]> = {
                    "all-plans": ["Todos os planos"],
                    growth: ["Plano Growth"],
                    scale: ["Plano Scale"],
                    squad: ["Plano Squad"],
                    enterprise: ["Plano Enterprise"],
                  };
                  setCouponForm({
                    ...couponForm,
                    applicableProducts: map[v] || ["Todos os planos"],
                  });
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-plans">Todos os planos</SelectItem>
                  <SelectItem value="growth">Plano Growth</SelectItem>
                  <SelectItem value="scale">Plano Scale</SelectItem>
                  <SelectItem value="squad">Plano Squad</SelectItem>
                  <SelectItem value="enterprise">Plano Enterprise</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={
                  couponForm.applicableProducts[0] === "Todos os produtos"
                    ? "all"
                    : couponForm.applicableProducts[0] === "Primeira compra"
                      ? "first"
                      : "specific"
                }
                onValueChange={(v) =>
                  setCouponForm({
                    ...couponForm,
                    applicableProducts: [
                      v === "all"
                        ? "Todos os produtos"
                        : v === "first"
                          ? "Primeira compra"
                          : "Produtos específicos",
                    ],
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  <SelectItem value="first">Primeira compra</SelectItem>
                  <SelectItem value="specific">Produtos específicos</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Uso por empresa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Uso por Empresa
              </Label>
              <Select
                value={couponForm.usageLimitPerCompany}
                onValueChange={(v: Coupon["usageLimitPerCompany"]) =>
                  setCouponForm({
                    ...couponForm,
                    usageLimitPerCompany: v,
                    maxUsesPerCompany:
                      v === "once"
                        ? 1
                        : v === "unlimited"
                          ? 0
                          : couponForm.maxUsesPerCompany || 3,
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Apenas 1 vez por empresa</SelectItem>
                  <SelectItem value="unlimited">
                    Ilimitado por empresa
                  </SelectItem>
                  <SelectItem value="custom">Limite personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {couponForm.usageLimitPerCompany === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Máx. por Empresa
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="3"
                  value={couponForm.maxUsesPerCompany || ""}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      maxUsesPerCompany: Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          {/* Restrição de acesso — só para desconto e bônus */}
          {couponForm.couponType !== "referral" &&
            (() => {
              const filteredCompanies = PLATFORM_COMPANIES.filter(
                (co) =>
                  companySearchQuery.trim() === "" ||
                  co.name
                    .toLowerCase()
                    .includes(companySearchQuery.toLowerCase()),
              );
              const selectedCompanyObjs = PLATFORM_COMPANIES.filter((co) =>
                couponForm.allowedCompanyIds.includes(String(co.id)),
              );
              // Users that belong to selected companies
              const usersOfSelectedCompanies = platformUsers.filter((u) =>
                u.company_associations?.some((a) =>
                  couponForm.allowedCompanyIds.includes(String(a.company_id)),
                ),
              );
              const allFilteredUsers = platformUsers.filter(
                (u) =>
                  userSearchQuery.trim() === "" ||
                  u.name.toLowerCase().includes(userSearchQuery.toLowerCase()),
              );
              const filteredUsersForCompany = usersOfSelectedCompanies.filter(
                (u) =>
                  userSearchQuery.trim() === "" ||
                  u.name.toLowerCase().includes(userSearchQuery.toLowerCase()),
              );

              return (
                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Restrição de Acesso
                  </Label>

                  {/* Mode selector */}
                  <div className="flex gap-2">
                    {(
                      [
                        { key: "none", label: "Sem restrição" },
                        { key: "company", label: "Por empresa" },
                        { key: "user", label: "Por usuário" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          setCompanySearchQuery("");
                          setUserSearchQuery("");
                          setCompanyPickerOpen(false);
                          setUserPickerOpen(false);
                          setCouponForm({
                            ...couponForm,
                            restrictionMode: m.key,
                            allowedCompanyIds: [],
                            allowedUserIds: [],
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          couponForm.restrictionMode === m.key
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Company combobox */}
                  {couponForm.restrictionMode === "company" && (
                    <div className="space-y-2">
                      <Popover
                        open={companyPickerOpen}
                        onOpenChange={(o) => {
                          setCompanyPickerOpen(o);
                          if (!o) setCompanySearchQuery("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-left hover:border-slate-300 transition-colors"
                          >
                            <span
                              className={
                                selectedCompanyObjs.length > 0
                                  ? "text-slate-800 dark:text-slate-200"
                                  : "text-slate-400"
                              }
                            >
                              {selectedCompanyObjs.length > 0
                                ? `${selectedCompanyObjs.length} empresa${selectedCompanyObjs.length > 1 ? "s" : ""} selecionada${selectedCompanyObjs.length > 1 ? "s" : ""}`
                                : "Buscar e selecionar empresa..."}
                            </span>
                            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-80 p-0 shadow-lg"
                          align="start"
                        >
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input
                                placeholder="Buscar empresa..."
                                value={companySearchQuery}
                                onChange={(e) =>
                                  setCompanySearchQuery(e.target.value)
                                }
                                className="pl-8 h-8 text-sm bg-white dark:bg-slate-800"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-52 overflow-y-auto p-1">
                            {filteredCompanies.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">
                                Nenhuma empresa encontrada
                              </p>
                            ) : (
                              filteredCompanies.map((co) => {
                                const isSelected =
                                  couponForm.allowedCompanyIds.includes(
                                    String(co.id),
                                  );
                                return (
                                  <div
                                    key={co.id}
                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                    onClick={() => {
                                      const newIds = isSelected
                                        ? couponForm.allowedCompanyIds.filter(
                                            (id) => id !== String(co.id),
                                          )
                                        : [
                                            ...couponForm.allowedCompanyIds,
                                            String(co.id),
                                          ];
                                      const stillValidUsers =
                                        couponForm.allowedUserIds.filter(
                                          (uid) =>
                                            platformUsers
                                              .find((u) => String(u.id) === uid)
                                              ?.company_associations?.some(
                                                (a) =>
                                                  newIds.includes(
                                                    String(a.company_id),
                                                  ),
                                              ),
                                        );
                                      setCouponForm({
                                        ...couponForm,
                                        allowedCompanyIds: newIds,
                                        allowedUserIds: stillValidUsers,
                                      });
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {co.name}
                                      </p>
                                      {co.document && (
                                        <p className="text-[10px] text-slate-400 truncate">
                                          {co.document}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Selected chips */}
                      {selectedCompanyObjs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCompanyObjs.map((co) => (
                            <span
                              key={co.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                            >
                              {co.name}
                              <button
                                type="button"
                                onClick={() => {
                                  const newIds =
                                    couponForm.allowedCompanyIds.filter(
                                      (id) => id !== String(co.id),
                                    );
                                  const stillValidUsers =
                                    couponForm.allowedUserIds.filter((uid) =>
                                      platformUsers
                                        .find((u) => String(u.id) === uid)
                                        ?.company_associations?.some((a) =>
                                          newIds.includes(String(a.company_id)),
                                        ),
                                    );
                                  setCouponForm({
                                    ...couponForm,
                                    allowedCompanyIds: newIds,
                                    allowedUserIds: stillValidUsers,
                                  });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* User combobox — appears after company selected */}
                      {selectedCompanyObjs.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Restringir por usuário
                            <span className="normal-case font-normal text-slate-400">
                              (vazio = todos da empresa)
                            </span>
                          </Label>
                          <Popover
                            open={userPickerOpen}
                            onOpenChange={(o) => {
                              setUserPickerOpen(o);
                              if (!o) setUserSearchQuery("");
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="w-full flex items-center justify-between px-3 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-left hover:border-slate-300 transition-colors"
                              >
                                <span
                                  className={
                                    couponForm.allowedUserIds.length > 0
                                      ? "text-slate-800 dark:text-slate-200"
                                      : "text-slate-400"
                                  }
                                >
                                  {couponForm.allowedUserIds.length > 0
                                    ? `${couponForm.allowedUserIds.length} usuário${couponForm.allowedUserIds.length > 1 ? "s" : ""} selecionado${couponForm.allowedUserIds.length > 1 ? "s" : ""}`
                                    : "Buscar usuário da empresa..."}
                                </span>
                                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-80 p-0 shadow-lg"
                              align="start"
                            >
                              <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                  <Input
                                    placeholder="Buscar usuário..."
                                    value={userSearchQuery}
                                    onChange={(e) =>
                                      setUserSearchQuery(e.target.value)
                                    }
                                    className="pl-8 h-8 text-sm bg-white dark:bg-slate-800"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-52 overflow-y-auto p-1">
                                {filteredUsersForCompany.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center py-4">
                                    Nenhum usuário encontrado
                                  </p>
                                ) : (
                                  filteredUsersForCompany.map((u) => {
                                    const isSelected =
                                      couponForm.allowedUserIds.includes(
                                        String(u.id),
                                      );
                                    const company = PLATFORM_COMPANIES.find(
                                      (co) =>
                                        u.company_associations?.some(
                                          (a) =>
                                            a.company_id === co.id &&
                                            couponForm.allowedCompanyIds.includes(
                                              String(co.id),
                                            ),
                                        ),
                                    );
                                    return (
                                      <div
                                        key={u.id}
                                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                        onClick={() => {
                                          setCouponForm({
                                            ...couponForm,
                                            allowedUserIds: isSelected
                                              ? couponForm.allowedUserIds.filter(
                                                  (id) => id !== String(u.id),
                                                )
                                              : [
                                                  ...couponForm.allowedUserIds,
                                                  String(u.id),
                                                ],
                                          });
                                        }}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          className="pointer-events-none"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                            {u.name}
                                          </p>
                                          {company && (
                                            <p className="text-[10px] text-slate-400 truncate">
                                              {company.name}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Selected user chips */}
                          {couponForm.allowedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {couponForm.allowedUserIds.map((uid) => {
                                const u = platformUsers.find(
                                  (u) => String(u.id) === uid,
                                );
                                return u ? (
                                  <span
                                    key={uid}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
                                  >
                                    {u.name}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCouponForm({
                                          ...couponForm,
                                          allowedUserIds:
                                            couponForm.allowedUserIds.filter(
                                              (id) => id !== uid,
                                            ),
                                        })
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct user combobox */}
                  {couponForm.restrictionMode === "user" && (
                    <div className="space-y-2">
                      <Popover
                        open={userPickerOpen}
                        onOpenChange={(o) => {
                          setUserPickerOpen(o);
                          if (!o) setUserSearchQuery("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-left hover:border-slate-300 transition-colors"
                          >
                            <span
                              className={
                                couponForm.allowedUserIds.length > 0
                                  ? "text-slate-800 dark:text-slate-200"
                                  : "text-slate-400"
                              }
                            >
                              {couponForm.allowedUserIds.length > 0
                                ? `${couponForm.allowedUserIds.length} usuário${couponForm.allowedUserIds.length > 1 ? "s" : ""} selecionado${couponForm.allowedUserIds.length > 1 ? "s" : ""}`
                                : "Buscar e selecionar usuário..."}
                            </span>
                            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-80 p-0 shadow-lg"
                          align="start"
                        >
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input
                                placeholder="Buscar usuário..."
                                value={userSearchQuery}
                                onChange={(e) =>
                                  setUserSearchQuery(e.target.value)
                                }
                                className="pl-8 h-8 text-sm bg-white dark:bg-slate-800"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-52 overflow-y-auto p-1">
                            {allFilteredUsers.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">
                                Nenhum usuário encontrado
                              </p>
                            ) : (
                              allFilteredUsers.map((u) => {
                                const isSelected =
                                  couponForm.allowedUserIds.includes(
                                    String(u.id),
                                  );
                                const company = PLATFORM_COMPANIES.find(
                                  (co) => co.id === u.company_id,
                                );
                                return (
                                  <div
                                    key={u.id}
                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                    onClick={() => {
                                      setCouponForm({
                                        ...couponForm,
                                        allowedUserIds: isSelected
                                          ? couponForm.allowedUserIds.filter(
                                              (id) => id !== String(u.id),
                                            )
                                          : [
                                              ...couponForm.allowedUserIds,
                                              String(u.id),
                                            ],
                                      });
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      className="pointer-events-none"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {u.name}
                                      </p>
                                      {company && (
                                        <p className="text-[10px] text-slate-400 truncate">
                                          {company.name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Selected user chips */}
                      {couponForm.allowedUserIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {couponForm.allowedUserIds.map((uid) => {
                            const u = platformUsers.find(
                              (u) => String(u.id) === uid,
                            );
                            return u ? (
                              <span
                                key={uid}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
                              >
                                {u.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCouponForm({
                                      ...couponForm,
                                      allowedUserIds:
                                        couponForm.allowedUserIds.filter(
                                          (id) => id !== uid,
                                        ),
                                    })
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Validity dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Válido De
              </Label>
              <Input
                type="date"
                value={couponForm.validFrom}
                onChange={(e) =>
                  setCouponForm({ ...couponForm, validFrom: e.target.value })
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Válido Até
              </Label>
              <Input
                type="date"
                value={couponForm.validUntil}
                onChange={(e) =>
                  setCouponForm({ ...couponForm, validUntil: e.target.value })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Affiliate section — only for coupon type "referral" */}
          {couponForm.couponType === "referral" && (
            <div className="space-y-3 p-3.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <Label className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Usuário Afiliado &amp; Comissão por Venda
              </Label>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">
                  Usuário vinculado ao cupom
                </Label>
                <Select
                  value={couponForm.linkedUserId || "none"}
                  onValueChange={(v) => {
                    const user = MOCK_USERS.find((u) => u.id === v);
                    setCouponForm({
                      ...couponForm,
                      linkedUserId: v === "none" ? "" : v,
                      linkedUserName: user?.name || "",
                    });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Selecionar usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {MOCK_USERS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {couponForm.linkedUserId &&
                couponForm.linkedUserId !== "none" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">
                        Tipo de comissão
                      </Label>
                      <Select
                        value={couponForm.linkedUserCommissionType}
                        onValueChange={(v: "percentage" | "fixed") =>
                          setCouponForm({
                            ...couponForm,
                            linkedUserCommissionType: v,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm bg-white dark:bg-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            Porcentagem (%)
                          </SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">
                        Comissão{" "}
                        {couponForm.linkedUserCommissionType === "percentage"
                          ? "(%)"
                          : "(R$)"}{" "}
                        por venda
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={couponForm.linkedUserCommissionValue || ""}
                        onChange={(e) =>
                          setCouponForm({
                            ...couponForm,
                            linkedUserCommissionValue: Number(e.target.value),
                          })
                        }
                        className="h-9 text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/60 dark:bg-slate-900/40 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              setCouponDialogOpen(false);
              setEditingCoupon(null);
              setCompanySearchQuery("");
              setUserSearchQuery("");
              setCompanyPickerOpen(false);
              setUserPickerOpen(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-9 btn-brand gap-1.5"
            onClick={saveCoupon}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={campaignToggle.campaign !== null}
        onClose={() => setCampaignToggle({ campaign: null, newStatus: false })}
        onConfirm={confirmCampaignToggle}
        title={
          campaignToggle.newStatus ? "Ativar Campanha" : "Desativar Campanha"
        }
        message={
          campaignToggle.newStatus
            ? `Tem certeza que deseja ativar a campanha "${campaignToggle.campaign?.name}"? Ela ficara disponivel para novos indicados.`
            : `Tem certeza que deseja desativar a campanha "${campaignToggle.campaign?.name}"? Novas indicacoes nao serao aceitas.`
        }
        confirmText={campaignToggle.newStatus ? "Ativar" : "Desativar"}
        destructive={!campaignToggle.newStatus}
      />

      <ConfirmationDialog
        open={couponToggle.coupon !== null}
        onClose={() => setCouponToggle({ coupon: null, newStatus: false })}
        onConfirm={confirmCouponToggle}
        title={couponToggle.newStatus ? "Ativar Cupom" : "Desativar Cupom"}
        message={
          couponToggle.newStatus
            ? `Tem certeza que deseja ativar o cupom "${couponToggle.coupon?.code}"? Ele ficara disponivel para uso.`
            : `Tem certeza que deseja desativar o cupom "${couponToggle.coupon?.code}"? Ele nao podera mais ser utilizado.`
        }
        confirmText={couponToggle.newStatus ? "Ativar" : "Desativar"}
        destructive={!couponToggle.newStatus}
      />

      {/* ── Partner Access Drawer ───────────────────────────────── */}
      {accessDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setAccessDrawerOpen(false)}
        />
      )}
      <div
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
        className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-950 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700 overflow-hidden ${
          accessDrawerOpen
            ? "translate-x-0 opacity-100 transition-[transform,opacity] duration-[560ms] ease-[cubic-bezier(0.2,0,0,1)]"
            : "translate-x-full opacity-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none"
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ background: headerGradient }}
        >
          <div className="flex items-center gap-2.5">
            <UserPlus className="h-4 w-4 text-white/80" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Criar Acesso Parceiro
              </h2>
              <p className="text-[11px] text-white/60 mt-0.5">
                {accessDrawerCampaign
                  ? `Campanha: ${accessDrawerCampaign.name}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAccessDrawerOpen(false)}
            className="rounded-md p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-lg space-y-5">
            <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-3 text-sm text-violet-700 dark:text-violet-300">
              <p className="font-semibold mb-0.5">Acesso ao Portal Parceiro</p>
              <p className="text-xs opacity-80">
                O parceiro receberá credenciais para acessar o portal em{" "}
                <span className="font-medium">/parceiro</span> e visualizar seus
                dados de indicação, comissões e solicitar saques.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Nome completo
                </Label>
                <Input
                  value={accessForm.name}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nome do parceiro"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  E-mail de acesso
                </Label>
                <Input
                  type="email"
                  value={accessForm.email}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Senha temporária
                </Label>
                <Input
                  type="password"
                  value={accessForm.password}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Mínimo 8 caracteres"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Tipo de chave PIX
                </Label>
                <select
                  value={accessForm.pixKeyType}
                  onChange={(e) =>
                    setAccessForm((f) => ({
                      ...f,
                      pixKeyType: e.target
                        .value as typeof accessForm.pixKeyType,
                    }))
                  }
                  className="h-9 text-sm w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave aleatória</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Chave PIX
                </Label>
                <Input
                  value={accessForm.pixKey}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, pixKey: e.target.value }))
                  }
                  placeholder="Chave para receber saques"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setAccessDrawerOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            disabled={
              accessSubmitting ||
              !accessForm.name ||
              !accessForm.email ||
              !accessForm.password
            }
            onClick={async () => {
              setAccessSubmitting(true);
              await new Promise((r) => setTimeout(r, 700));
              toast({
                title: "Acesso criado com sucesso",
                description: `${accessForm.name} já pode acessar o portal parceiro.`,
              });
              setAccessSubmitting(false);
              setAccessDrawerOpen(false);
            }}
          >
            {accessSubmitting ? "Criando..." : "Criar Acesso"}
          </Button>
        </div>
      </div>

      {/* ── Report Drawer ────────────────────────────────────────── */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setReportOpen(false)}
        />
      )}
      <div
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
        }}
        className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-950 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700 overflow-hidden ${
          reportOpen
            ? "translate-x-0 opacity-100 transition-[transform,opacity] duration-[560ms] ease-[cubic-bezier(0.2,0,0,1)]"
            : "translate-x-full opacity-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,1,1)] pointer-events-none"
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ background: headerGradient }}
        >
          <div className="flex items-center gap-2.5">
            <BarChart2 className="h-4 w-4 text-white/80" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Relatório de Campanhas e Promoções
              </h2>
              <p className="text-[11px] text-white/60 mt-0.5">
                Análise detalhada de cliques, conversões e abandono
              </p>
            </div>
          </div>
          <button
            onClick={() => setReportOpen(false)}
            className="rounded-md p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex-shrink-0 flex flex-wrap gap-x-4 gap-y-2.5 items-end">
          {/* Period */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Período
            </span>
            <div className="flex gap-1">
              {(["today", "week", "month", "quarter", "custom"] as const).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setReportFilters((f) => ({ ...f, period: p }))
                    }
                    className={`px-2 py-1 text-[11px] rounded-md font-medium transition-colors ${
                      reportFilters.period === p
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
                    }`}
                  >
                    {p === "today"
                      ? "Hoje"
                      : p === "week"
                        ? "Semana"
                        : p === "month"
                          ? "Mês"
                          : p === "quarter"
                            ? "Trimestre"
                            : "Custom"}
                  </button>
                ),
              )}
            </div>
          </div>
          {reportFilters.period === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={reportFilters.dateFrom}
                onChange={(e) =>
                  setReportFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
                className="h-7 text-xs w-32"
              />
              <span className="text-slate-300 text-xs">até</span>
              <Input
                type="date"
                value={reportFilters.dateTo}
                onChange={(e) =>
                  setReportFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
                className="h-7 text-xs w-32"
              />
            </div>
          )}
          {/* Type */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Tipo
            </span>
            <Select
              value={reportFilters.reportType}
              onValueChange={(v) =>
                setReportFilters((f) => ({ ...f, reportType: v as any }))
              }
            >
              <SelectTrigger className="h-7 text-[11px] w-36 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="campaigns">Campanhas</SelectItem>
                <SelectItem value="coupons">Cupons</SelectItem>
                <SelectItem value="influencers">Influencers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Status
            </span>
            <Select
              value={reportFilters.statusFilter}
              onValueChange={(v) =>
                setReportFilters((f) => ({ ...f, statusFilter: v }))
              }
            >
              <SelectTrigger className="h-7 text-[11px] w-32 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="ended">Encerrado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="disabled">Desativado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Account type */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Tipo de Conta
            </span>
            <Select
              value={reportFilters.accountType}
              onValueChange={(v) =>
                setReportFilters((f) => ({ ...f, accountType: v }))
              }
            >
              <SelectTrigger className="h-7 text-[11px] w-32 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="empresas">Empresas</SelectItem>
                <SelectItem value="agencias">Agências</SelectItem>
                <SelectItem value="nomades">Nômades</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Metric focus */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Destaque
            </span>
            <div className="flex gap-1">
              {(["all", "clicks", "conversions", "abandonment"] as const).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() =>
                      setReportFilters((f) => ({ ...f, metricFocus: m }))
                    }
                    className={`px-2 py-1 text-[11px] rounded-md font-medium transition-colors ${
                      reportFilters.metricFocus === m
                        ? m === "clicks"
                          ? "bg-sky-500 text-white shadow-sm"
                          : m === "conversions"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : m === "abandonment"
                              ? "bg-rose-500 text-white shadow-sm"
                              : "bg-slate-700 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    {m === "all"
                      ? "Tudo"
                      : m === "clicks"
                        ? "Cliques"
                        : m === "conversions"
                          ? "Conversões"
                          : "Abandono"}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          ref={reportPageRef}
          className="flex-1 overflow-auto bg-white dark:bg-slate-950"
        >
          {/* Summary cards */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <div
              className={`rounded-lg px-3 py-2.5 flex flex-col gap-0.5 ${reportFilters.metricFocus === "clicks" ? "bg-sky-50 ring-1 ring-sky-200" : "bg-slate-50 dark:bg-slate-900"}`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Cliques
              </span>
              <span className="text-lg font-bold text-sky-600">
                {rTotalClicks.toLocaleString("pt-BR")}
              </span>
            </div>
            <div
              className={`rounded-lg px-3 py-2.5 flex flex-col gap-0.5 ${reportFilters.metricFocus === "conversions" ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50 dark:bg-slate-900"}`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Conversões
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {rTotalConversions.toLocaleString("pt-BR")}
              </span>
            </div>
            <div
              className={`rounded-lg px-3 py-2.5 flex flex-col gap-0.5 ${reportFilters.metricFocus === "abandonment" ? "bg-rose-50 ring-1 ring-rose-200" : "bg-slate-50 dark:bg-slate-900"}`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Abandono
              </span>
              <span className="text-lg font-bold text-rose-500">
                {rTotalAbandonment.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="rounded-lg px-3 py-2.5 flex flex-col gap-0.5 bg-slate-50 dark:bg-slate-900">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Taxa Conv.
              </span>
              <span className="text-lg font-bold text-violet-600">
                {rAvgRate}%
              </span>
            </div>
            <div className="rounded-lg px-3 py-2.5 flex flex-col gap-0.5 bg-slate-50 dark:bg-slate-900">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Receita
              </span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                R$ {rTotalRevenue.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="rounded-lg px-3 py-2.5 flex flex-col gap-0.5 bg-slate-50 dark:bg-slate-900">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Comissão
              </span>
              <span className="text-lg font-bold text-amber-600">
                R$ {rTotalCommission.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="px-5 py-3">
            {reportItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Nenhum item encontrado com os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-2 py-2 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Nome / Código
                    </th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500 dark:text-slate-400">
                      Tipo
                    </th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500 dark:text-slate-400">
                      Conta
                    </th>
                    <th
                      className={`text-right px-2 py-2 font-semibold whitespace-nowrap ${reportFilters.metricFocus === "clicks" ? "text-sky-500" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      Cliques
                    </th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Usos
                    </th>
                    <th
                      className={`text-right px-2 py-2 font-semibold whitespace-nowrap ${reportFilters.metricFocus === "conversions" ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      Conversões
                    </th>
                    <th
                      className={`text-right px-2 py-2 font-semibold whitespace-nowrap ${reportFilters.metricFocus === "abandonment" ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      Abandono
                    </th>
                    <th className="text-right px-2 py-2 font-semibold text-violet-500 whitespace-nowrap">
                      Taxa Conv.
                    </th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Receita
                    </th>
                    <th className="text-right px-2 py-2 font-semibold text-amber-500 whitespace-nowrap">
                      Comissão
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((item, idx) => {
                    const statusColors: Record<string, string> = {
                      active: "bg-emerald-100 text-emerald-700",
                      paused: "bg-amber-100 text-amber-700",
                      ended: "bg-slate-100 text-slate-600",
                      expired: "bg-orange-100 text-orange-700",
                      disabled: "bg-red-100 text-red-700",
                    };
                    const statusLabels: Record<string, string> = {
                      active: "Ativo",
                      paused: "Pausado",
                      ended: "Encerrado",
                      expired: "Expirado",
                      disabled: "Desativado",
                    };
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 dark:border-slate-800 ${idx % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-900/30" : ""}`}
                      >
                        <td className="px-2 py-1.5 font-medium text-slate-700 dark:text-slate-200 max-w-[180px] truncate">
                          {item.name}
                        </td>
                        <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400">
                          {item.kind}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColors[item.status] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {statusLabels[item.status] ?? item.status}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-slate-400 dark:text-slate-500">
                          {item.accountType}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums ${reportFilters.metricFocus === "clicks" ? "font-semibold text-sky-600" : "text-slate-600 dark:text-slate-300"}`}
                        >
                          {item.clicks.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {item.conversions.toLocaleString("pt-BR")}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums ${reportFilters.metricFocus === "conversions" ? "font-semibold text-emerald-600" : "text-slate-600 dark:text-slate-300"}`}
                        >
                          {item.conversions.toLocaleString("pt-BR")}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums ${reportFilters.metricFocus === "abandonment" ? "font-semibold text-rose-500" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {item.abandonment.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-violet-600">
                          {item.rate}%
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          R$ {item.revenue.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-amber-600">
                          R$ {item.commission.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer — export buttons */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {reportItems.length} {reportItems.length === 1 ? "item" : "itens"}{" "}
            no relatório
          </span>
          <div className="flex gap-1.5">
            <Button
              onClick={exportReportAsCsv}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-2.5 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
              CSV
            </Button>
            <Button
              onClick={exportReportAsDoc}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-2.5 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            >
              <FileDown className="h-3 w-3 text-blue-600" />
              DOC
            </Button>
            <Button
              onClick={exportReportAsPdf}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-2.5 border-slate-200 hover:border-red-300 hover:text-red-500"
            >
              <FileText className="h-3 w-3 text-red-500" />
              PDF
            </Button>
            <Button
              onClick={exportReportAsPng}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-2.5 border-slate-200 hover:border-sky-300 hover:text-sky-600"
            >
              <Image className="h-3 w-3 text-sky-500" />
              PNG
            </Button>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter Modal ─────────────────────────────────── */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFilterModalOpen(false);
          }}
        >
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[780px] max-h-[82vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{ background: headerGradient }}
            >
              <div>
                <h2 className="text-sm font-bold text-white">
                  Filtros Avançados
                </h2>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Configure e aplique filtros
                </p>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left — Saved Filters */}
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
                        onDragStart={() => setDraggingFilterId(filter.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverFilterId(filter.id);
                        }}
                        onDrop={() => {
                          if (
                            !draggingFilterId ||
                            draggingFilterId === filter.id
                          )
                            return;
                          const from = savedFilters.findIndex(
                            (f) => f.id === draggingFilterId,
                          );
                          const to = savedFilters.findIndex(
                            (f) => f.id === filter.id,
                          );
                          const next = [...savedFilters];
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          setSavedFilters(next);
                          setDraggingFilterId(null);
                          setDragOverFilterId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingFilterId(null);
                          setDragOverFilterId(null);
                        }}
                        onClick={() => {
                          if (editingFilterId) return;
                          setAdvancedFilters(filter.filters);
                          setSelectedFilterId(filter.id);
                          setUnsavedChanges(false);
                        }}
                        className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                          dragOverFilterId === filter.id &&
                          draggingFilterId !== filter.id
                            ? "border-blue-400 bg-blue-50"
                            : draggingFilterId === filter.id
                              ? "opacity-40"
                              : selectedFilterId === filter.id
                                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                                : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                        }`}
                      >
                        <GripVertical className="h-3 w-3 text-slate-300 flex-shrink-0 cursor-grab" />
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
                                      ? { ...f, name: editingFilterName.trim() }
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
                                      ? { ...f, name: editingFilterName.trim() }
                                      : f,
                                  ),
                                );
                              setEditingFilterId(null);
                            }}
                            className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="flex-1 truncate">{filter.name}</span>
                        )}
                        {editingFilterId !== filter.id && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFilterId(filter.id);
                                setEditingFilterName(filter.name);
                              }}
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

              {/* Right — Filter fields */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* Identificação */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Identificação
                    </p>
                    <Input
                      placeholder="Nome da campanha ou código do cupom..."
                      value={
                        advancedFilters.statuses.length === 0 &&
                        advancedFilters.types.length === 0 &&
                        advancedFilters.commissionTypes.length === 0
                          ? ""
                          : ""
                      }
                      onChange={() => {}}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Tipo */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Tipo
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { v: "referral", l: "Campanha de Indicação" },
                        { v: "influencer", l: "Campanha Influencer" },
                        { v: "discount", l: "Cupom Desconto" },
                        { v: "credit-bonus", l: "Cupom Bônus" },
                        { v: "referral-coupon", l: "Cupom Afiliado" },
                      ].map(({ v, l }) => (
                        <button
                          key={v}
                          onClick={() => {
                            const t = advancedFilters.types.includes(v)
                              ? advancedFilters.types.filter((x) => x !== v)
                              : [...advancedFilters.types, v];
                            setAdvancedFilters({
                              ...advancedFilters,
                              types: t,
                            });
                            if (selectedFilterId) setUnsavedChanges(true);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            advancedFilters.types.includes(v)
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          v: "active",
                          l: "Ativa / Ativo",
                          color: "bg-emerald-500 border-emerald-500",
                        },
                        {
                          v: "paused",
                          l: "Pausada",
                          color: "bg-amber-500 border-amber-500",
                        },
                        {
                          v: "ended",
                          l: "Encerrada",
                          color: "bg-slate-500 border-slate-500",
                        },
                        {
                          v: "expired",
                          l: "Expirado",
                          color: "bg-slate-400 border-slate-400",
                        },
                        {
                          v: "disabled",
                          l: "Desativado",
                          color: "bg-rose-500 border-rose-500",
                        },
                      ].map(({ v, l, color }) => (
                        <button
                          key={v}
                          onClick={() => {
                            const s = advancedFilters.statuses.includes(v)
                              ? advancedFilters.statuses.filter((x) => x !== v)
                              : [...advancedFilters.statuses, v];
                            setAdvancedFilters({
                              ...advancedFilters,
                              statuses: s,
                            });
                            if (selectedFilterId) setUnsavedChanges(true);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            advancedFilters.statuses.includes(v)
                              ? `${color} text-white`
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tipo de Comissão */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Tipo de Comissão
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { v: "fixed-first", l: "Fixo 1ª compra" },
                        { v: "per-referral", l: "Por indicação ativa" },
                        { v: "percentage", l: "% sobre vendas" },
                      ].map(({ v, l }) => (
                        <button
                          key={v}
                          onClick={() => {
                            const ct = advancedFilters.commissionTypes.includes(
                              v,
                            )
                              ? advancedFilters.commissionTypes.filter(
                                  (x) => x !== v,
                                )
                              : [...advancedFilters.commissionTypes, v];
                            setAdvancedFilters({
                              ...advancedFilters,
                              commissionTypes: ct,
                            });
                            if (selectedFilterId) setUnsavedChanges(true);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            advancedFilters.commissionTypes.includes(v)
                              ? "bg-violet-500 text-white border-violet-500"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data de Vigência */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Data de Vigência
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={advancedFilters.dateFrom}
                        onChange={(e) => {
                          setAdvancedFilters({
                            ...advancedFilters,
                            dateFrom: e.target.value,
                          });
                          if (selectedFilterId) setUnsavedChanges(true);
                        }}
                        className="h-7 text-xs flex-1"
                      />
                      <span className="text-slate-300 text-xs flex-shrink-0">
                        até
                      </span>
                      <Input
                        type="date"
                        value={advancedFilters.dateTo}
                        onChange={(e) => {
                          setAdvancedFilters({
                            ...advancedFilters,
                            dateTo: e.target.value,
                          });
                          if (selectedFilterId) setUnsavedChanges(true);
                        }}
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
              <button
                onClick={() => {
                  setAdvancedFilters({
                    statuses: [],
                    types: [],
                    commissionTypes: [],
                    dateFrom: "",
                    dateTo: "",
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
                      onChange={(e) => setFilterNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && filterNameInput.trim()) {
                          const newId = `filter-${Date.now()}`;
                          setSavedFilters([
                            ...savedFilters,
                            {
                              id: newId,
                              name: filterNameInput.trim(),
                              filters: advancedFilters,
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
                            filters: advancedFilters,
                          },
                        ]);
                        setSelectedFilterId(newId);
                        setUnsavedChanges(false);
                        setShowSaveInput(false);
                        setFilterNameInput("");
                      }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveInput(false);
                        setFilterNameInput("");
                      }}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-[11px] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors"
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
                              ? { ...f, filters: advancedFilters }
                              : f,
                          ),
                        );
                        setUnsavedChanges(false);
                      }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all shadow-sm"
                    >
                      Atualizar filtro
                    </button>
                    <button
                      onClick={() => {
                        setFilterNameInput(`Filtro ${savedFilters.length + 1}`);
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
                      setFilterNameInput(`Filtro ${savedFilters.length + 1}`);
                      setShowSaveInput(true);
                    }}
                    className="h-7 px-3 rounded-md text-[11px] font-medium bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                  >
                    Salvar filtro
                  </button>
                )}
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setAppliedFilters(advancedFilters);
                    setCurrentPage(1);
                    setIsFilterModalOpen(false);
                  }}
                  className="h-7 px-4 rounded-md text-[11px] font-semibold btn-brand transition-all shadow-sm"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
