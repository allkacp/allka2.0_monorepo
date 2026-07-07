// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { PageLoader } from "@/components/ui/loading";
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
import { PageHeader } from "@/components/page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { SlidePanel } from "@/components/slide-panel";
import { NeonBadge } from "@/components/neon-badge";
import { Settings2 } from "lucide-react";

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

// Users and companies loaded from API
let MOCK_USERS: { id: string; name: string; role: string }[] = [];

let MOCK_COMPANIES: {
  id: string;
  name: string;
  accountType: AccountTypeRestriction;
  userIds: string[];
}[] = [];

const ACCOUNT_TYPE_LABELS: Record<AccountTypeRestriction, string> = {
  empresas: "Empresas",
  agencias: "Agências",
  nomades: "Nômades",
};

// Campaigns and coupons loaded from API

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
    fixed: "Valor fixo",
  };
  return labels[type] ?? type;
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  coupon: "Cupom",
  link: "Link direto",
  referral: "Indicação",
  influencer: "Influencer",
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

type ItemColKey = "nome" | "tipo" | "status" | "valor" | "vinculado" | "uso" | "total_pago" | "validade";
const ITEM_COLUMNS: { key: ItemColKey; label: string; info: string; sortField?: string; sortType?: "text" | "number" | "date" | "status" }[] = [
  { key: "nome", label: "Nome / Código", info: "Nome da campanha ou código do cupom.", sortField: "name", sortType: "text" },
  { key: "tipo", label: "Tipo", info: "Campanha (indicação/link) ou cupom (desconto/bônus/afiliado)." },
  { key: "status", label: "Status", info: "Situação atual do item.", sortField: "status", sortType: "status" },
  { key: "valor", label: "Comissão / Desconto", info: "Valor de comissão (campanha) ou desconto/bônus (cupom).", sortField: "value", sortType: "number" },
  { key: "vinculado", label: "Vinculado a", info: "Usuário vinculado a este item, se houver." },
  { key: "uso", label: "Uso / Indicações", info: "Indicações ativas (campanha) ou usos realizados (cupom).", sortField: "usage", sortType: "number" },
  { key: "total_pago", label: "Total pago", info: "Total pago em comissões — aplica-se só a campanhas.", sortField: "totalPaid", sortType: "number" },
  { key: "validade", label: "Validade", info: "Período de vigência.", sortField: "validUntil", sortType: "date" },
];

type UnifiedRow = {
  kind: "campaign" | "coupon";
  id: string;
  name: string;
  type: string;
  status: string;
  value: number;
  valueLabel: string;
  linkedUserName: string;
  usage: number;
  usageLabel: string;
  totalPaid: number | null;
  validFrom: string;
  validUntil: string;
  campaign?: Campaign;
  coupon?: Coupon;
};

function campaignToUnifiedRow(c: Campaign): UnifiedRow {
  return {
    kind: "campaign",
    id: c.id,
    name: c.name,
    type: c.campaignType,
    status: c.status,
    value: c.commissionValue,
    valueLabel: c.commissionType === "percentage" ? `${c.commissionValue}%` : `R$ ${c.commissionValue}`,
    linkedUserName: c.linkedUserName ?? "",
    usage: c.activeReferrals,
    usageLabel: `${c.activeReferrals} indicações`,
    totalPaid: c.totalEarned,
    validFrom: c.startDate,
    validUntil: c.endDate,
    campaign: c,
  };
}

function couponToUnifiedRow(c: Coupon): UnifiedRow {
  return {
    kind: "coupon",
    id: c.id,
    name: c.code,
    type: c.couponType,
    status: c.status,
    value: c.couponType === "credit-bonus" ? c.creditBonus ?? 0 : c.discountValue,
    valueLabel:
      c.couponType === "credit-bonus"
        ? `${c.creditBonus} créditos`
        : c.discountType === "percentage"
          ? `${c.discountValue}% OFF`
          : `R$ ${c.discountValue} OFF`,
    linkedUserName: c.linkedUserName ?? "",
    usage: c.usedCount,
    usageLabel: c.usageLimit > 0 ? `${c.usedCount} / ${c.usageLimit}` : `${c.usedCount} usos`,
    totalPaid: null,
    validFrom: c.validFrom,
    validUntil: c.validUntil,
    coupon: c,
  };
}

// Backend returns snake_case (real Campaign/Coupon Prisma models) — map to
// the camelCase shape this page already renders. Numbers/links below are
// real, derived server-side from actual PartnerCommission/CouponUsage rows,
// not fabricated client-side.
function mapCampaignFromApi(c: any): Campaign {
  return {
    id: c.id,
    name: c.name,
    campaignType: c.type,
    commissionType: c.commission_type,
    commissionValue: c.commission_value,
    minReferrals: c.min_referrals ?? 1,
    maxReferrals: c.max_referrals ?? 0,
    activeReferrals: c.active_referrals ?? 0,
    totalEarned: c.total_earned ?? 0,
    status: c.status,
    startDate: c.start_date,
    endDate: c.end_date,
    linkedCouponId: undefined,
    linkedCouponCode: c.coupon_code ?? "",
    linkedUserId: c.linked_user_id ?? "",
    linkedUserName: c.linked_user_name ?? "",
  } as Campaign;
}

// Inverse of mapCampaignFromApi/mapCouponFromApi — the create/edit forms
// still work in this page's original camelCase shape, but the real backend
// (Zod schema in routes/campaigns.ts and routes/coupons.ts) expects the
// actual DB column names and a narrower set of real enum values.
function mapCampaignToApi(form: any) {
  return {
    name: form.name,
    type: form.campaignType === "influencer" ? "referral" : form.campaignType,
    status: form.status,
    commission_type: form.commissionType === "percentage" ? "percentage" : "fixed",
    commission_value: form.commissionValue,
    coupon_code: form.linkedCouponCode || undefined,
    start_date: form.startDate ? new Date(form.startDate).toISOString() : undefined,
    end_date: form.endDate ? new Date(form.endDate).toISOString() : undefined,
  };
}

function mapCouponToApi(form: any) {
  return {
    code: form.code,
    coupon_type: form.couponType,
    discount_type: form.discountType,
    discount_value: form.discountValue,
    credit_bonus: form.creditBonus,
    usage_limit: form.usageLimit,
    usage_limit_per_company: form.usageLimitPerCompany,
    max_uses_per_company: form.maxUsesPerCompany,
    valid_from: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
    valid_until: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
    applicable_products: form.applicableProducts,
    allowed_account_types: form.allowedAccountTypes,
    allowed_company_ids: form.allowedCompanyIds,
    allowed_user_ids: form.allowedUserIds,
    linked_user_id: form.linkedUserId || undefined,
    linked_user_commission_type: form.linkedUserCommissionType,
    linked_user_commission_value: form.linkedUserCommissionValue,
  };
}

function mapCouponFromApi(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    couponType: c.coupon_type,
    discountType: c.discount_type,
    discountValue: c.discount_value,
    creditBonus: c.credit_bonus,
    usageLimit: c.usage_limit,
    usageLimitPerCompany: c.usage_limit_per_company,
    maxUsesPerCompany: c.max_uses_per_company,
    usedCount: c.used_count ?? 0,
    validFrom: c.valid_from,
    validUntil: c.valid_until,
    applicableProducts: Array.isArray(c.applicable_products) && c.applicable_products.length > 0
      ? c.applicable_products
      : ["Todos os produtos"],
    allowedAccountTypes: c.allowed_account_types ?? [],
    allowedCompanyIds: c.allowed_company_ids ?? [],
    allowedUserIds: c.allowed_user_ids ?? [],
    linkedUserId: c.linked_user_id ?? "",
    linkedUserName: c.linked_user_name ?? "",
    linkedUserCommissionType: c.linked_user_commission_type ?? "percentage",
    linkedUserCommissionValue: c.linked_user_commission_value ?? 0,
    status: c.status,
  } as Coupon;
}

export default function CampanhasPage() {
  const { toast } = useToast();
  const { sidebarSettings, sidebarWidth } = useSidebar();
  const { users: platformUsers } = usePlatformUsers();
  const pageRef = useRef<HTMLDivElement>(null);

  const {
    sortKey: itemSortKey,
    sortDir: itemSortDir,
    handleSort: handleItemSort,
    sortData: sortItemData,
  } = useSorting<UnifiedRow>();

  const [itemVisibleCols, setItemVisibleCols] = useState<Set<ItemColKey>>(
    new Set(["nome", "tipo", "status", "valor", "vinculado", "uso", "total_pago", "validade"]),
  );

  const {
    tableScrollRef: itemTableScrollRef,
    topScrollRef: itemTopScrollRef,
    bottomScrollRef: itemBottomScrollRef,
    handleTopBarScroll: handleItemTopBarScroll,
    handleTableScroll: handleItemTableScroll,
    handleBottomBarScroll: handleItemBottomBarScroll,
    hasHorizontalOverflow: itemHasHorizontalOverflow,
  } = useTableScrollSync([itemVisibleCols.size]);

  // Unified Campanhas + Cupons table state
  const [itemSearch, setItemSearch] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useItemsPerPage("admin-campanhas-indicacao", 10);

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

  // Unified column config + filters (Tipo: campanha/cupom, Status)
  const [itemColConfigOpen, setItemColConfigOpen] = useState(false);
  const [itemFiltersOpen, setItemFiltersOpen] = useState(false);
  const [itemKindFilter, setItemKindFilter] = useState<Set<"campaign" | "coupon">>(new Set());
  const [itemStatusFilter, setItemStatusFilter] = useState<Set<string>>(new Set());
  const itemActiveFilterCount = itemKindFilter.size + itemStatusFilter.size;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Load data from API
  useEffect(() => {
    let done = 0;
    const checkDone = () => {
      done++;
      if (done >= 2) setPageLoading(false);
    };
    apiClient
      .getCampaigns()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setCampaigns(list.map(mapCampaignFromApi));
      })
      .catch(() => {})
      .finally(checkDone);
    apiClient
      .getCoupons()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setCoupons(list.map(mapCouponFromApi));
      })
      .catch(() => {})
      .finally(checkDone);
    apiClient
      .getUsers({ limit: "200" })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        MOCK_USERS = list.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          role: u.role || "",
        }));
      })
      .catch(() => {});
    apiClient
      .getCompanies({ limit: "200" })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        MOCK_COMPANIES = list.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          accountType: c.account_type || "empresas",
          userIds: [],
        }));
      })
      .catch(() => {});
  }, []);
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

  // isClosing states for unmount-on-close animated drawers
  const [accessClosing, setAccessClosing] = useState(false);

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

  // Unified Campanhas + Cupons list — one searchable/filterable/sortable table
  const allItems: UnifiedRow[] = [
    ...campaigns.map(campaignToUnifiedRow),
    ...coupons.map(couponToUnifiedRow),
  ];
  const filteredItems = allItems.filter((row) => {
    if (itemSearch && !row.name.toLowerCase().includes(itemSearch.toLowerCase()))
      return false;
    if (itemKindFilter.size > 0 && !itemKindFilter.has(row.kind)) return false;
    if (itemStatusFilter.size > 0 && !itemStatusFilter.has(row.status)) return false;
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
  const saveCampaign = async () => {
    const linkedCoupon = coupons.find(
      (c) => c.id === campaignForm.linkedCouponId,
    );
    const data = {
      ...campaignForm,
      linkedCouponCode: linkedCoupon?.code || campaignForm.linkedCouponCode,
    };
    try {
      if (editingCampaign) {
        const updated = await apiClient.updateCampaign(
          editingCampaign.id,
          mapCampaignToApi(data),
        );
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === editingCampaign.id ? { ...c, ...data, ...mapCampaignFromApi(updated) } : c,
          ),
        );
        toast({
          title: "Sucesso",
          description: "Campanha atualizada com sucesso",
        });
      } else {
        const created = await apiClient.createCampaign({
          ...mapCampaignToApi(data),
          status: "active",
        });
        setCampaigns((prev) => [
          ...prev,
          {
            ...data,
            activeReferrals: 0,
            totalEarned: 0,
            status: "active" as const,
            id: created?.id || String(Date.now()),
            ...mapCampaignFromApi(created),
          },
        ]);
        toast({ title: "Sucesso", description: "Campanha criada com sucesso" });
      }
    } catch (e) {
      toast({
        title: "Erro",
        description: "Falha ao salvar campanha",
        variant: "destructive",
      });
    }
    closeCampaignDialog();
  };
  const deleteCampaign = async (id: string) => {
    try {
      await apiClient.deleteCampaign(id);
    } catch {}
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };
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
  const closeCouponDrawer = () => {
    setCouponDialogOpen(false);
    setEditingCoupon(null);
    setCompanySearchQuery("");
    setUserSearchQuery("");
    setCompanyPickerOpen(false);
    setUserPickerOpen(false);
  };
  const saveCoupon = async () => {
    const user = MOCK_USERS.find((u) => u.id === couponForm.linkedUserId);
    const data = {
      ...couponForm,
      linkedUserName: user?.name || couponForm.linkedUserName,
    };
    try {
      if (editingCoupon) {
        const updated = await apiClient.updateCoupon(editingCoupon.id, mapCouponToApi(data));
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === editingCoupon.id ? { ...c, ...data, ...mapCouponFromApi(updated) } : c,
          ),
        );
        toast({
          title: "Sucesso",
          description: "Cupom atualizado com sucesso",
        });
      } else {
        const created = await apiClient.createCoupon({
          ...mapCouponToApi(data),
          status: "active",
        });
        setCoupons((prev) => [
          ...prev,
          {
            ...data,
            usedCount: 0,
            status: "active" as const,
            id: created?.id || String(Date.now()),
            ...mapCouponFromApi(created),
          },
        ]);
        toast({ title: "Sucesso", description: "Cupom criado com sucesso" });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao salvar cupom",
        variant: "destructive",
      });
    }
    closeCouponDrawer();
  };
  const deleteCoupon = async (id: string) => {
    try {
      await apiClient.deleteCoupon(id);
    } catch {}
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };
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
  const closeAccessDrawer = () => {
    if (accessClosing) return;
    setAccessClosing(true);
    setTimeout(() => {
      setAccessDrawerOpen(false);
      setAccessClosing(false);
    }, 420);
  };
  const closeReportDrawer = () => {
    setReportOpen(false);
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

  const sortedItems = sortItemData(filteredItems);
  const totalItemPages = Math.max(1, Math.ceil(sortedItems.length / itemPageSize));
  const pagedItems = sortedItems.slice(
    (itemPage - 1) * itemPageSize,
    itemPage * itemPageSize,
  );
  const getItemPageNumbers = (): (number | "...")[] => {
    const total = totalItemPages;
    const cur = itemPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (cur >= total - 3)
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", cur - 1, cur, cur + 1, "...", total];
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

  if (pageLoading) {
    return <PageLoader text="Carregando campanhas…" />;
  }

  return (
    <div className="space-y-5" ref={pageRef}>
      <PageHeader
        title="Campanhas e Promoções"
        description="Gerencie campanhas de indicação, cupons de desconto e ações promocionais"
        actions={<>
          <ExportButton pageRef={pageRef} filename="campanhas" />
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setReportOpen(true)}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <BarChart2 className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Relatório
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Ver relatório</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openNewCoupon}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Novo Cupom
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo cupom</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openNewCampaign}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Nova Campanha
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar nova campanha</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-linear-to-br from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-950 border-2 border-blue-300/70 dark:border-blue-800/70 px-3 pt-2 pb-1.5">
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
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-linear-to-br from-emerald-500 to-teal-600 dark:from-emerald-800 dark:to-teal-900 border-2 border-emerald-300/70 dark:border-emerald-800/70 px-3 pt-2 pb-1.5">
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
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-linear-to-br from-violet-500 to-purple-700 dark:from-violet-800 dark:to-purple-950 border-2 border-violet-300/70 dark:border-violet-800/70 px-3 pt-2 pb-1.5">
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
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-linear-to-br from-orange-500 to-rose-600 dark:from-orange-800 dark:to-rose-900 border-2 border-orange-300/70 dark:border-orange-800/70 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Total Investido
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            R$ {(totalInvested ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Campanhas + Cupons — uma única tabela padrão admin/empresas, com filtro por tipo */}
      <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha ou cupom..."
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setItemPage(1);
              }}
              className="pl-8 h-9 text-sm w-full"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconToolbarButton
              icon={Filter}
              tooltip={itemActiveFilterCount > 0 ? `Filtros (${itemActiveFilterCount} ativos)` : "Filtros"}
              onClick={() => setItemFiltersOpen(true)}
            />
            <IconToolbarButton
              icon={Settings2}
              tooltip="Configurar colunas"
              onClick={() => setItemColConfigOpen(true)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <ItemsPerPageSelect
              value={itemPageSize.toString()}
              onValueChange={(v) => { setItemPageSize(Number(v)); setItemPage(1); }}
              variant="top"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {(() => {
                const start = sortedItems.length === 0 ? 0 : (itemPage - 1) * itemPageSize + 1;
                const end = Math.min(itemPage * itemPageSize, sortedItems.length);
                return (
                  <>
                    {start}-{end} de{" "}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{sortedItems.length}</span>{" "}
                    item{sortedItems.length !== 1 ? "s" : ""}
                  </>
                );
              })()}
            </span>
          </div>
          {itemHasHorizontalOverflow && (
            <div
              ref={itemTopScrollRef}
              onScroll={handleItemTopBarScroll}
              title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
              className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
              style={{ height: 12 }}
            >
              <div style={{ minWidth: 960, height: 1 }} />
            </div>
          )}
          {totalItemPages > 1 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setItemPage((v) => Math.max(1, v - 1))}
                disabled={itemPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getItemPageNumbers().map((pg, i) =>
                pg === "..." ? (
                  <span key={i} className="text-xs text-slate-300 px-0.5">·</span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setItemPage(Number(pg))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      pg === itemPage
                        ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                    }`}
                    style={pg === itemPage ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
                  >
                    {pg}
                  </button>
                ),
              )}
              <button
                onClick={() => setItemPage((v) => Math.min(totalItemPages, v + 1))}
                disabled={itemPage === totalItemPages}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum item encontrado</p>
          </div>
        ) : (
          <div ref={itemTableScrollRef} onScroll={handleItemTableScroll} className="overflow-x-auto allka-table-scroll-body">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  <th
                    className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                    style={{ position: "sticky", left: 0, top: 0, zIndex: 3, minWidth: 108, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(100,116,139,0.18)" }}
                  >
                    Ações
                  </th>
                  {ITEM_COLUMNS.filter((c) => itemVisibleCols.has(c.key)).map((col) => (
                    <th
                      key={col.key}
                      className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none"
                      style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(148,163,184,0.16)" }}
                    >
                      <div className="inline-flex items-center gap-1">
                        {col.sortField ? (
                          <SortableHeader
                            label={col.label}
                            field={col.sortField}
                            type={col.sortType ?? "text"}
                            sortKey={itemSortKey as string | null}
                            sortDir={itemSortDir}
                            onSort={handleItemSort}
                          />
                        ) : (
                          <span>{col.label}</span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-slate-300 dark:text-slate-600 cursor-help text-[10px]">ⓘ</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[200px]">{col.info}</TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row, i) => {
                  const statusTone: Record<string, string> = {
                    active: "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_12px_rgba(16,185,129,0.65)] dark:bg-emerald-800/70 dark:text-emerald-100",
                    paused: "border-amber-500 bg-amber-200 text-amber-900 shadow-[0_0_12px_rgba(245,158,11,0.65)] dark:bg-amber-800/70 dark:text-amber-100",
                    ended: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
                    disabled: "border-rose-500 bg-rose-200 text-rose-900 shadow-[0_0_12px_rgba(244,63,94,0.65)] dark:bg-rose-800/70 dark:text-rose-100",
                    expired: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
                  };
                  const statusDot: Record<string, string> = {
                    active: "bg-emerald-500",
                    paused: "bg-amber-500",
                    ended: "bg-slate-400",
                    disabled: "bg-rose-500",
                    expired: "bg-slate-400",
                  };
                  const statusLabel: Record<string, string> = {
                    active: row.kind === "campaign" ? "Ativa" : "Ativo",
                    paused: "Pausada",
                    ended: "Encerrada",
                    disabled: "Desativado",
                    expired: "Expirado",
                  };
                  return (
                  <tr
                    key={`${row.kind}-${row.id}`}
                    className={`group transition-colors ${
                      i % 2 === 0
                        ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                        : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"
                    }`}
                  >
                    <td
                      className={`px-1 py-2 transition-colors ${
                        i % 2 === 0
                          ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                          : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                      }`}
                      style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 108, borderRight: "1px solid rgba(100,116,139,0.18)" }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch
                                checked={row.status === "active"}
                                onCheckedChange={(checked) =>
                                  row.kind === "campaign"
                                    ? setCampaignToggle({ campaign: row.campaign!, newStatus: checked })
                                    : setCouponToggle({ coupon: row.coupon!, newStatus: checked })
                                }
                                disabled={row.kind === "campaign" && row.status === "ended"}
                                className="data-[state=checked]:bg-emerald-500 scale-75"
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs font-medium">{row.status === "active" ? "Desativar" : "Ativar"}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => (row.kind === "campaign" ? openEditCampaign(row.campaign!) : openEditCoupon(row.coupon!))}
                              className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs font-medium">{row.kind === "campaign" ? "Editar campanha" : "Editar cupom"}</TooltipContent>
                        </Tooltip>
                        {row.kind === "campaign" && row.campaign!.campaignType === "influencer" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  setAccessDrawerCampaign(row.campaign!);
                                  setAccessForm({ name: row.campaign!.linkedUserName ?? "", email: "", password: "", pixKey: "", pixKeyType: "cpf" });
                                  setAccessDrawerOpen(true);
                                }}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-blue-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Criar acesso do influencer</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => (row.kind === "campaign" ? deleteCampaign(row.id) : deleteCoupon(row.id))}
                              className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs font-medium">{row.kind === "campaign" ? "Excluir campanha" : "Excluir cupom"}</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {itemVisibleCols.has("nome") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${row.kind === "campaign" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-violet-100 dark:bg-violet-900/30"}`}>
                            {row.kind === "campaign" ? (
                              row.campaign!.campaignType === "influencer" ? <Star className="h-4 w-4 text-blue-600" /> : <Share2 className="h-4 w-4 text-blue-600" />
                            ) : (
                              (() => { const TypeIcon = getCouponTypeConfig(row.coupon!.couponType).icon; return <TypeIcon className="h-4 w-4 text-violet-600" />; })()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-bold text-sm text-slate-800 dark:text-slate-100 ${row.kind === "coupon" ? "font-mono" : ""} truncate`}>{row.name}</p>
                            <NeonBadge color={row.kind === "campaign" ? (row.type === "referral" ? "emerald" : row.type === "link" ? "blue" : "purple") : "violet"}>
                              {row.kind === "campaign" ? (CAMPAIGN_TYPE_LABELS[row.type] ?? row.type) : getCouponTypeConfig(row.type).label}
                            </NeonBadge>
                          </div>
                        </div>
                      </td>
                    )}
                    {itemVisibleCols.has("tipo") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <NeonBadge color={row.kind === "campaign" ? "blue" : "purple"}>
                          {row.kind === "campaign" ? "Campanha" : "Cupom"}
                        </NeonBadge>
                      </td>
                    )}
                    {itemVisibleCols.has("status") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${statusTone[row.status] ?? statusTone.ended}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[row.status] ?? statusDot.ended}`} />
                          {statusLabel[row.status] ?? row.status}
                        </span>
                      </td>
                    )}
                    {itemVisibleCols.has("valor") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{row.valueLabel}</p>
                        {row.kind === "campaign" && (
                          <p className="text-[11px] text-slate-400">{getCommissionTypeLabel(row.campaign!.commissionType)}</p>
                        )}
                      </td>
                    )}
                    {itemVisibleCols.has("vinculado") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        {row.linkedUserName ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {row.linkedUserName}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}
                    {itemVisibleCols.has("uso") && (
                      <td className="py-3 px-4 text-center" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className="inline-flex items-center gap-1 font-semibold text-sm text-slate-700 dark:text-slate-300">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          {row.usageLabel}
                        </span>
                      </td>
                    )}
                    {itemVisibleCols.has("total_pago") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        {row.totalPaid !== null ? (
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">R$ {row.totalPaid.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}
                    {itemVisibleCols.has("validade") && (
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {row.validFrom ? new Date(row.validFrom).toLocaleDateString("pt-BR") : "—"}
                        {" — "}
                        {row.validUntil ? new Date(row.validUntil).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sortedItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
            <div className="flex items-center gap-3">
              <ItemsPerPageSelect
                value={itemPageSize.toString()}
                onValueChange={(v) => { setItemPageSize(Number(v)); setItemPage(1); }}
                variant="bottom"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            {itemHasHorizontalOverflow && (
              <div
                ref={itemBottomScrollRef}
                onScroll={handleItemBottomBarScroll}
                title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                style={{ height: 12 }}
              >
                <div style={{ minWidth: 960, height: 1 }} />
              </div>
            )}
            {totalItemPages > 1 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setItemPage((v) => Math.max(1, v - 1))}
                  disabled={itemPage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {getItemPageNumbers().map((pg, i) =>
                  pg === "..." ? (
                    <span key={i} className="text-xs text-slate-300 px-0.5">·</span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setItemPage(Number(pg))}
                      className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        pg === itemPage
                          ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                      }`}
                      style={pg === itemPage ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
                    >
                      {pg}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setItemPage((v) => Math.min(totalItemPages, v + 1))}
                  disabled={itemPage === totalItemPages}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Campaign Drawer ──────────────────────────────────────── */}
        <SlidePanel
          open={campaignDialogOpen}
          onClose={closeCampaignDialog}
          title={editingCampaign ? "Editar Campanha" : "Nova Campanha"}
          subtitle="Configure os parâmetros, comissões e vínculos da campanha"
          widthMode="full"
          footer={
            <div className="flex justify-end gap-2">
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
          }
        >
            <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
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
                    active:
                      "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
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
                      <SelectItem value="fixed-first">
                        Fixo na 1ª compra
                      </SelectItem>
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
                    {campaignForm.commissionType === "percentage"
                      ? "(%)"
                      : "(R$)"}
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
            </div>
        </SlidePanel>

      {/* ── Coupon Drawer ────────────────────────────────────────── */}
        <SlidePanel
          open={couponDialogOpen}
          onClose={closeCouponDrawer}
          title={editingCoupon ? "Editar Cupom" : "Novo Cupom"}
          subtitle="Configure o tipo, código, restrições e regras de uso"
          widthMode="full"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={closeCouponDrawer}
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
          }
        >
            <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
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
                    active:
                      "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
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
                      {couponForm.discountType === "percentage"
                        ? "(%)"
                        : "(R$)"}
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
                      <SelectItem value="enterprise">
                        Plano Enterprise
                      </SelectItem>
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
                      <SelectItem value="specific">
                        Produtos específicos
                      </SelectItem>
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
                      <SelectItem value="once">
                        Apenas 1 vez por empresa
                      </SelectItem>
                      <SelectItem value="unlimited">
                        Ilimitado por empresa
                      </SelectItem>
                      <SelectItem value="custom">
                        Limite personalizado
                      </SelectItem>
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
                      couponForm.allowedCompanyIds.includes(
                        String(a.company_id),
                      ),
                    ),
                  );
                  const allFilteredUsers = platformUsers.filter(
                    (u) =>
                      userSearchQuery.trim() === "" ||
                      u.name
                        .toLowerCase()
                        .includes(userSearchQuery.toLowerCase()),
                  );
                  const filteredUsersForCompany =
                    usersOfSelectedCompanies.filter(
                      (u) =>
                        userSearchQuery.trim() === "" ||
                        u.name
                          .toLowerCase()
                          .includes(userSearchQuery.toLowerCase()),
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
                                                  .find(
                                                    (u) => String(u.id) === uid,
                                                  )
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
                                                      (id) =>
                                                        id !== String(u.id),
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
                      setCouponForm({
                        ...couponForm,
                        validFrom: e.target.value,
                      })
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
                      setCouponForm({
                        ...couponForm,
                        validUntil: e.target.value,
                      })
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
                              <SelectItem value="fixed">
                                Valor Fixo (R$)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">
                            Comissão{" "}
                            {couponForm.linkedUserCommissionType ===
                            "percentage"
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
                                linkedUserCommissionValue: Number(
                                  e.target.value,
                                ),
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
            </div>
        </SlidePanel>

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
      {(accessDrawerOpen || accessClosing) && (
        <>
          <div
            data-slot="sheet-content"
            data-state={accessClosing ? "closed" : "open"}
            style={{
              left: `${sidebarWidth}px`,
              width: `calc(100vw - ${sidebarWidth}px)`,
            }}
            className="fixed top-0 z-50 h-[calc(100vh-24px)] bg-background shadow-2xl flex flex-col border-l border-border overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
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
                onClick={closeAccessDrawer}
                className="rounded-md p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-lg space-y-5">
                <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-3 text-sm text-violet-700 dark:text-violet-300">
                  <p className="font-semibold mb-0.5">
                    Acesso ao Portal Parceiro
                  </p>
                  <p className="text-xs opacity-80">
                    O parceiro receberá credenciais para acessar o portal em{" "}
                    <span className="font-medium">/parceiro</span> e visualizar
                    seus dados de indicação, comissões e solicitar saques.
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
                        setAccessForm((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
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
                onClick={closeAccessDrawer}
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
                  closeAccessDrawer();
                }}
              >
                {accessSubmitting ? "Criando..." : "Criar Acesso"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Report Drawer ────────────────────────────────────────── */}
        <SlidePanel
          open={reportOpen}
          onClose={closeReportDrawer}
          title="Relatório de Campanhas e Promoções"
          subtitle="Análise detalhada de cliques, conversões e abandono"
          widthMode="full"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400">
                {reportItems.length}{" "}
                {reportItems.length === 1 ? "item" : "itens"} no relatório
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
          }
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
            {/* Filters bar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex-shrink-0 flex flex-wrap gap-x-4 gap-y-2.5 items-end">
              {/* Period */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Período
                </span>
                <div className="flex gap-1">
                  {(
                    ["today", "week", "month", "quarter", "custom"] as const
                  ).map((p) => (
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
                  ))}
                </div>
              </div>
              {reportFilters.period === "custom" && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={reportFilters.dateFrom}
                    onChange={(e) =>
                      setReportFilters((f) => ({
                        ...f,
                        dateFrom: e.target.value,
                      }))
                    }
                    className="h-7 text-xs w-32"
                  />
                  <span className="text-slate-300 text-xs">até</span>
                  <Input
                    type="date"
                    value={reportFilters.dateTo}
                    onChange={(e) =>
                      setReportFilters((f) => ({
                        ...f,
                        dateTo: e.target.value,
                      }))
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
                  {(
                    ["all", "clicks", "conversions", "abandonment"] as const
                  ).map((m) => (
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
                  ))}
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
          </div>
        </SlidePanel>

      {/* Filtros — Tipo (Campanha/Cupom) + Status */}
      <SlidePanel
        open={itemFiltersOpen}
        onClose={() => setItemFiltersOpen(false)}
        title="Filtros"
        subtitle="Filtre campanhas e cupons por tipo e status."
        widthMode="full"
        footer={
          itemActiveFilterCount > 0 ? (
            <button
              onClick={() => {
                setItemKindFilter(new Set());
                setItemStatusFilter(new Set());
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpar filtros
            </button>
          ) : undefined
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipo</p>
            <div className="space-y-1.5">
              {(["campaign", "coupon"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemKindFilter.has(k)}
                    onChange={() => {
                      setItemKindFilter((prev) => {
                        const next = new Set(prev);
                        next.has(k) ? next.delete(k) : next.add(k);
                        return next;
                      });
                      setItemPage(1);
                    }}
                  />
                  {k === "campaign" ? "Campanha" : "Cupom"}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
            <div className="space-y-1.5">
              {(["active", "paused", "ended", "disabled", "expired"] as const).map((s3) => (
                <label key={s3} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemStatusFilter.has(s3)}
                    onChange={() => {
                      setItemStatusFilter((prev) => {
                        const next = new Set(prev);
                        next.has(s3) ? next.delete(s3) : next.add(s3);
                        return next;
                      });
                      setItemPage(1);
                    }}
                  />
                  {s3 === "active"
                    ? "Ativo(a)"
                    : s3 === "paused"
                      ? "Pausada"
                      : s3 === "ended"
                        ? "Encerrada"
                        : s3 === "disabled"
                          ? "Desativado"
                          : "Expirado"}
                </label>
              ))}
            </div>
          </div>
        </div>
        </div>
      </SlidePanel>

      {/* Configurar colunas */}
      <SlidePanel
        open={itemColConfigOpen}
        onClose={() => setItemColConfigOpen(false)}
        title="Configurar colunas"
        subtitle={`${itemVisibleCols.size} de ${ITEM_COLUMNS.length} visíveis`}
        widthMode="full"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() =>
                setItemVisibleCols(
                  new Set([
                    "nome",
                    "tipo",
                    "status",
                    "valor",
                    "vinculado",
                    "uso",
                    "total_pago",
                    "validade",
                  ]),
                )
              }
              className="h-9 px-4 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Restaurar padrão
            </button>
            <button
              onClick={() =>
                setItemVisibleCols(new Set(ITEM_COLUMNS.map((c) => c.key)))
              }
              className="h-9 px-4 rounded-lg text-xs font-semibold btn-brand transition-all"
            >
              Mostrar todas
            </button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ITEM_COLUMNS.map((col) => (
              <label
                key={col.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors",
                  itemVisibleCols.has(col.key)
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                <Checkbox
                  checked={itemVisibleCols.has(col.key)}
                  onCheckedChange={() => {
                    setItemVisibleCols((prev) => {
                      const next = new Set(prev);
                      next.has(col.key) ? next.delete(col.key) : next.add(col.key);
                      return next;
                    });
                  }}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {col.label}
                  </span>
                  {col.info && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{col.info}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
