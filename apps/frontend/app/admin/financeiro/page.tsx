// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GripVertical } from "lucide-react";
import { NeonBadge } from "@/components/neon-badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageLoader } from "@/components/ui/loading";
import { ExportButton } from "@/components/export-button";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { AdvancedDateFilter } from "@/components/advanced-date-filter";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { SlidePanel } from "@/components/slide-panel";
import type { DateRange } from "react-day-picker";
import { PageHeader } from "@/components/page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  Building2,
  FolderOpen,
  Calendar,
  ReceiptText,
  Banknote,
  Clock,
  Users,
  UserCheck,
  Pencil,
  Trash2,
  Filter,
  Cog,
  Columns3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  X,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  ExternalLink,
  RefreshCw,
  DollarSign,
  Gift,
  CreditCard,
  Repeat2,
  Layers,
  Info,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  ShieldCheck,
  FileText,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const INVOICE_STATUS_LABELS = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Em Atraso",
  cancelled: "Cancelado",
};

const INVOICE_STATUS_CLASSES = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  paid:     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  overdue:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400",
  cancelled:"bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400",
};
const INVOICE_STATUS_COLOR = { pending: "amber", paid: "emerald", overdue: "red", cancelled: "slate" };

const WD_STATUS_LABELS = {
  aguardando_analise: "Aguardando",
  pagamento_agendado: "Agendado",
  pagamento_efetuado: "Pago",
  cancelado: "Cancelado",
  reprovado: "Reprovado",
};

const WD_STATUS_CLASSES = {
  aguardando_analise:"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  pagamento_agendado:"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  pagamento_efetuado:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  cancelado:         "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400",
  reprovado:         "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400",
};
const WD_STATUS_COLOR = { aguardando_analise: "amber", pagamento_agendado: "blue", pagamento_efetuado: "emerald", cancelado: "slate", reprovado: "red" };

// Saques de Partner usam status em inglês (model PartnerWithdrawal), diferente
// do enum em português do saque de Nômade (WithdrawalRequest) acima — os dois
// fluxos são independentes, então os rótulos/cores também são independentes.
const PARTNER_WD_STATUS_LABELS = {
  pending: "Aguardando",
  approved: "Aprovado",
  paid: "Pago",
  rejected: "Reprovado",
  cancelled: "Cancelado",
};
const PARTNER_WD_STATUS_COLOR = { pending: "amber", approved: "blue", paid: "emerald", rejected: "red", cancelled: "slate" };

const WALLET_OWNER_LABELS: Record<string, string> = {
  company:  "Empresa",
  agency:   "Agência",
  nomad:    "Nômade",
  partner:  "Partner",
  platform: "Plataforma",
};

const WALLET_OWNER_COLORS: Record<string, string> = {
  company:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  agency:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  nomad:    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  partner:  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  platform: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300",
};
const WALLET_OWNER_COLOR_TOKEN: Record<string, string> = { company: "blue", agency: "violet", nomad: "amber", partner: "emerald", platform: "slate" };

const WALLET_STATUS_LABELS: Record<string, string> = {
  active:    "Ativa",
  suspended: "Suspensa",
  closed:    "Encerrada",
};

const WALLET_STATUS_CLASSES: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  suspended: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  closed:    "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-700/50 dark:text-slate-500",
};
const WALLET_STATUS_COLOR: Record<string, string> = { active: "emerald", suspended: "amber", closed: "slate" };

const LEDGER_TYPE_LABELS: Record<string, string> = {
  credit:     "Crédito",
  debit:      "Débito",
  adjustment: "Ajuste",
  block:      "Bloqueio",
  unblock:    "Desbloqueio",
  refund:     "Estorno",
  commission: "Comissão",
  withdrawal: "Saque",
  payment:    "Pagamento",
  fee:        "Taxa",
  bonus:      "Bônus",
  penalty:    "Penalidade",
};

const EXP_CATEGORIES = [
  "Administrativo", "Ferramentas e Sistemas", "Marketing", "Financeiro",
  "Jurídico/Contábil", "Infraestrutura", "Pessoas", "Operacional",
  "Impostos e Taxas", "Outros",
];

const INVOICE_COLUMNS = [
  { key: "numero", label: "Nº / Descrição", required: true },
  { key: "empresa", label: "Empresa" },
  { key: "projeto", label: "Projeto" },
  { key: "valor", label: "Valor" },
  { key: "vencimento", label: "Vencimento" },
  { key: "status", label: "Status" },
];
const DEFAULT_INVOICE_VISIBLE_COLS = new Set(INVOICE_COLUMNS.map((c) => c.key));

const EXP_STATUS_LABELS = {
  prevista:  "Prevista",
  pendente:  "Pendente",
  paga:      "Paga",
  atrasada:  "Atrasada",
  cancelada: "Cancelada",
};

const EXP_STATUS_CLASSES = {
  prevista:  "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400",
  pendente:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  paga:      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  atrasada:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400",
  cancelada: "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-700/50 dark:text-slate-500",
};
const EXP_STATUS_COLOR = { prevista: "slate", pendente: "amber", paga: "emerald", atrasada: "red", cancelada: "slate" };

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminFinanceiroPage() {
  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();
  const pageRef = useRef(null);
  const [headerHeight] = useState(64);
  const [footerHeight] = useState(0);

  // ── state: invoices ────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const [invPerPage, setInvPerPage] = useItemsPerPage("admin-fin-inv", 10);
  const [invSearch, setInvSearch] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState("all");
  const [invLoading, setInvLoading] = useState(true);
  const [invVisibleCols, setInvVisibleCols] = useState(new Set(DEFAULT_INVOICE_VISIBLE_COLS));
  const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
  const [billingStats, setBillingStats] = useState(null);
  const [dreData, setDreData] = useState<any>(null);

  // ── state: withdrawals ─────────────────────────────────────────────────────
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdLoading, setWdLoading] = useState(true);
  const [wdSearch, setWdSearch] = useState("");
  const [wdStatusFilter, setWdStatusFilter] = useState("all");
  const [wdPerPage, setWdPerPage] = useItemsPerPage("admin-fin-wd", 10);
  const [wdPage, setWdPage] = useState(1);

  // ── state: withdrawals — sub-aba Nômades | Partners (fluxos independentes,
  // /financial/withdrawals para Nômade e /partners/admin/withdrawals p/ Partner) ──
  const [wdSubTab, setWdSubTab] = useState<"nomades" | "partners">("nomades");
  const [partnerWithdrawals, setPartnerWithdrawals] = useState([]);
  const [pwLoading, setPwLoading] = useState(true);
  const [pwSearch, setPwSearch] = useState("");
  const [pwStatusFilter, setPwStatusFilter] = useState("all");
  const [pwPerPage, setPwPerPage] = useItemsPerPage("admin-fin-pw", 10);
  const [pwPage, setPwPage] = useState(1);
  const [pwRejectingId, setPwRejectingId] = useState(null);
  const [pwRejectNote, setPwRejectNote] = useState("");
  const [pwActionLoading, setPwActionLoading] = useState(null);

  // ── state: expenses ────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expPage, setExpPage] = useState(1);
  const [expPerPage, setExpPerPage] = useItemsPerPage("admin-fin-exp", 10);
  const [expSearch, setExpSearch] = useState("");
  const [expStatusFilter, setExpStatusFilter] = useState("all");
  const [expCategoryFilter, setExpCategoryFilter] = useState("all");
  const [expTypeFilter, setExpTypeFilter] = useState("all");
  const [expLoading, setExpLoading] = useState(false);
  const [expStats, setExpStats] = useState<any>(null);
  const [expSheetOpen, setExpSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expDeleteTarget, setExpDeleteTarget] = useState<string | null>(null);
  const [expForm, setExpForm] = useState({
    name: "", description: "", category: "Outros", amount: "",
    type: "fixa", recurrence: "mensal", status: "prevista",
    due_date: "", payment_method: "", department: "",
    competence_month: "", notes: "", is_recurring_base: false,
  });

  // ── state: wallets ─────────────────────────────────────────────────────────
  const [wallets, setWallets] = useState([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const [walletPage, setWalletPage] = useState(1);
  const [walletPerPage, setWalletPerPage] = useItemsPerPage("admin-fin-wallet", 10);
  const [walletSearch, setWalletSearch] = useState("");
  const [walletTypeFilter, setWalletTypeFilter] = useState("all");
  const [walletStatusFilter, setWalletStatusFilter] = useState("all");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletStats, setWalletStats] = useState<any>(null);
  // extrato (ledger) drawer
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerSummary, setLedgerSummary] = useState<any>(null);
  const [ledgerDirFilter, setLedgerDirFilter] = useState("all");
  const [ledgerDateRange, setLedgerDateRange] = useState<DateRange | undefined>(undefined);
  // adjustment
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustWallet, setAdjustWallet] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({ direction: "credit", amount: "", description: "", notes: "" });

  // ── state: carteiras — projeções e ledger global ──────────────────────────
  const [walletProjections, setWalletProjections] = useState<any>(null);
  const [walletHorizon, setWalletHorizon] = useState(30);
  const [walletDateRange, setWalletDateRange] = useState<DateRange | undefined>(undefined);
  const [globalLedgerOpen, setGlobalLedgerOpen] = useState(false);
  const [globalLedgerType, setGlobalLedgerType] = useState("all");
  const [globalLedgerDir, setGlobalLedgerDir] = useState("all");
  const [globalLedgerRefType, setGlobalLedgerRefType] = useState("all");
  const [globalLedgerTitle, setGlobalLedgerTitle] = useState("");
  const [globalLedger, setGlobalLedger] = useState([]);
  const [globalLedgerTotal, setGlobalLedgerTotal] = useState(0);
  const [globalLedgerPage, setGlobalLedgerPage] = useState(1);
  const [globalLedgerLoading, setGlobalLedgerLoading] = useState(false);
  const [globalLedgerSummary, setGlobalLedgerSummary] = useState<any>(null);
  const [projectionsOpen, setProjectionsOpen] = useState(false);
  const [projectionsMode, setProjectionsMode] = useState<"credits"|"debits">("credits");

  // ── state: squad ───────────────────────────────────────────────────────────
  const [squadStats, setSquadStats] = useState<any>(null);
  const [squadList, setSquadList] = useState<any[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadSearch, setSquadSearch] = useState("");
  const [squadPerPage, setSquadPerPage] = useItemsPerPage("admin-fin-squad", 50);
  const [squadAddOpen, setSquadAddOpen] = useState(false);
  const [squadEditTarget, setSquadEditTarget] = useState<any>(null);
  const [squadDetailTarget, setSquadDetailTarget] = useState<any>(null);
  const [squadCurrentCycle, setSquadCurrentCycle] = useState<any>(null);
  const [squadCycleLoading, setSquadCycleLoading] = useState(false);
  const [squadForm, setSquadForm] = useState({
    company_id: "", credit_limit: "", monthly_minimum: "", billing_day: "1",
    payment_terms: "30", notes: "",
  });
  const [squadFormLoading, setSquadFormLoading] = useState(false);

  // ── state: conciliação bancária ────────────────────────────────────────────
  const [concilLoading, setConcilLoading] = useState(false);
  const [concilData, setConcilData] = useState<any[]>([]);
  const [concilTotal, setConcilTotal] = useState(0);
  const [concilPage, setConcilPage] = useState(1);
  const [concilPerPage, setConcilPerPage] = useItemsPerPage("admin-fin-concil", 25);
  const [concilStats, setConcilStats] = useState<any>(null);
  const [concilDateRange, setConcilDateRange] = useState<DateRange | undefined>(undefined);
  const [concilImpact, setConcilImpact] = useState("all");   // all | bank_in | bank_out
  const [concilOrigin, setConcilOrigin] = useState("all");   // all | payment | withdrawal | …
  const [concilOwnerType, setConcilOwnerType] = useState("all");
  const [concilSearch, setConcilSearch] = useState("");

  // ── state: period ──────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // ── state: UI ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"faturas" | "saques" | "despesas" | "carteiras" | "squad" | "conciliacao">("faturas");
  const [filterOpen, setFilterOpen] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  // Shared scroll-mirror sync — only one tab's table is mounted at a time, so
  // the same refs bind to whichever is active; re-check on tab switch since
  // switching mounts a brand-new table element.
  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([activeTab]);
  // saved filters (session-only, like Projetos)
  const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; status: string; wdStatus: string }[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [savedFilterName, setSavedFilterName] = useState("");
  // draft state inside the modal (applied on "Aplicar Filtros")
  const [draftInvStatus, setDraftInvStatus] = useState("all");
  const [draftWdStatus, setDraftWdStatus] = useState("all");
  const [draftExpStatus, setDraftExpStatus] = useState("all");
  const [draftExpCategory, setDraftExpCategory] = useState("all");
  const [draftExpType, setDraftExpType] = useState("all");
  const [draftWalletType, setDraftWalletType] = useState("all");
  const [draftWalletStatus, setDraftWalletStatus] = useState("all");
  const [filterActiveTab, setFilterActiveTab] = useState<"faturas" | "saques" | "despesas" | "carteiras" | "squad" | "conciliacao">("faturas");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    company_id: "", project_id: "", amount: "", status: "pending",
    due_date: "", description: "", invoice_number: "",
  });

  // ── period ─────────────────────────────────────────────────────────────────
  const periodFrom = dateRange?.from ? dateRange.from.toISOString() : undefined;
  const periodTo   = dateRange?.to   ? dateRange.to.toISOString()   : undefined;
  const periodActive = !!(periodFrom && periodTo);

  // ── load invoices ──────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    setInvLoading(true);
    try {
      const filters: Record<string, any> = { limit: invPerPage, page: invPage };
      if (invStatusFilter !== "all") filters.status = invStatusFilter;
      if (periodFrom) filters.from = periodFrom;
      if (periodTo)   filters.to   = periodTo;
      const statsParams = periodFrom ? { from: periodFrom, to: periodTo } : undefined;
      const dreParams = statsParams;
      const [res, stats, dre] = await Promise.all([
        apiClient.getInvoices(filters),
        apiClient.getBillingStats(statsParams),
        dreParams ? apiClient.getDRE(dreParams.from, dreParams.to) : Promise.resolve(null),
      ]);
      setInvoices(res.data || []);
      setInvoiceTotal(res.total || 0);
      setBillingStats(stats);
      setDreData(dre);
    } catch (err) {
      console.error("[Financeiro] invoices:", err);
    } finally {
      setInvLoading(false);
    }
  }, [invPage, invPerPage, invStatusFilter, periodFrom, periodTo]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // ── load withdrawals ───────────────────────────────────────────────────────
  const loadWithdrawals = useCallback(async () => {
    setWdLoading(true);
    try {
      const res = await apiClient.getWithdrawals({ limit: "500" });
      setWithdrawals(res.data || []);
    } catch (err) {
      console.error("[Financeiro] withdrawals:", err);
    } finally {
      setWdLoading(false);
    }
  }, []);

  useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);

  // ── load partner withdrawals ────────────────────────────────────────────────
  const loadPartnerWithdrawals = useCallback(async () => {
    setPwLoading(true);
    try {
      const res = await apiClient.getAdminPartnerWithdrawals({ limit: "500" });
      setPartnerWithdrawals(res.data || []);
    } catch (err) {
      console.error("[Financeiro] partner withdrawals:", err);
    } finally {
      setPwLoading(false);
    }
  }, []);

  useEffect(() => { loadPartnerWithdrawals(); }, [loadPartnerWithdrawals]);

  // ── load expenses ──────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setExpLoading(true);
    try {
      const filters: Record<string, any> = { limit: expPerPage, page: expPage };
      if (expStatusFilter !== "all")   filters.status   = expStatusFilter;
      if (expCategoryFilter !== "all") filters.category = expCategoryFilter;
      if (expTypeFilter !== "all")     filters.type     = expTypeFilter;
      if (expSearch.trim())            filters.search   = expSearch.trim();
      if (periodFrom) filters.from = periodFrom;
      if (periodTo)   filters.to   = periodTo;
      const [res, stats] = await Promise.all([
        apiClient.getExpenses(filters),
        apiClient.getExpenseStats(periodFrom ? { from: periodFrom, to: periodTo } : undefined),
      ]);
      setExpenses(res.data || []);
      setExpenseTotal(res.total || 0);
      setExpStats(stats);
    } catch (err) {
      console.error("[Financeiro] expenses:", err);
    } finally {
      setExpLoading(false);
    }
  }, [expPage, expPerPage, expStatusFilter, expCategoryFilter, expTypeFilter, expSearch, periodFrom, periodTo]);

  useEffect(() => { if (activeTab === "despesas") loadExpenses(); }, [loadExpenses, activeTab]);

  // ── load squad ─────────────────────────────────────────────────────────────
  const loadSquad = useCallback(async () => {
    setSquadLoading(true);
    try {
      const [stats, list] = await Promise.all([
        apiClient.getSquadStats(),
        apiClient.getSquadList({ limit: 200 }),
      ]);
      setSquadStats(stats);
      setSquadList(list.data || []);
    } catch (err) {
      console.error("[Financeiro] squad:", err);
    } finally {
      setSquadLoading(false);
    }
  }, []);

  useEffect(() => { if (activeTab === "squad") loadSquad(); }, [loadSquad, activeTab]);

  // ── load conciliação ───────────────────────────────────────────────────────
  const concilFrom = concilDateRange?.from?.toISOString();
  const concilTo   = concilDateRange?.to?.toISOString();

  const loadConciliation = useCallback(async () => {
    setConcilLoading(true);
    try {
      const params: Record<string, any> = { page: concilPage, limit: concilPerPage };
      if (concilFrom)                        params.from       = concilFrom;
      if (concilTo)                          params.to         = concilTo;
      if (concilImpact !== "all")            params.impact     = concilImpact;
      if (concilOrigin !== "all")            params.origin     = concilOrigin;
      if (concilOwnerType !== "all")         params.owner_type = concilOwnerType;
      if (concilSearch.trim())               params.search     = concilSearch.trim();
      const res = await apiClient.getWalletConciliation(params);
      setConcilData(res.data || []);
      setConcilTotal(res.total || 0);
      setConcilStats(res.summary || null);
    } catch (err) {
      console.error("[Financeiro] conciliation:", err);
    } finally {
      setConcilLoading(false);
    }
  }, [concilPage, concilPerPage, concilFrom, concilTo, concilImpact, concilOrigin, concilOwnerType, concilSearch]);

  useEffect(() => { if (activeTab === "conciliacao") loadConciliation(); }, [loadConciliation, activeTab]);

  // ── load companies ─────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.getCompanies({ limit: "200" })
      .then((r) => setCompanies(r.data || []))
      .catch(() => {});
  }, []);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!billingStats) return { paid: 0, pending: 0, overdue: 0, avgTicket: 0, invoiceCount: 0 };
    const map: Record<string, number> = {};
    (billingStats.byStatus || []).forEach((s) => { map[s.status] = s.amount; });
    return {
      paid: map["paid"] ?? 0,
      pending: map["pending"] ?? 0,
      overdue: map["overdue"] ?? 0,
      avgTicket: billingStats.avgTicket ?? 0,
      invoiceCount: billingStats.invoiceCount ?? 0,
    };
  }, [billingStats]);

  const wdPending = useMemo(
    () => withdrawals.filter((w) => w.status === "aguardando_analise").length,
    [withdrawals]
  );

  const pwPending = useMemo(
    () => partnerWithdrawals.filter((w) => w.status === "pending").length,
    [partnerWithdrawals]
  );

  // ── filtered data ──────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    if (!invSearch.trim()) return invoices;
    const q = invSearch.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.company?.name?.toLowerCase().includes(q) ||
        inv.project?.title?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.description?.toLowerCase().includes(q)
    );
  }, [invoices, invSearch]);

  const filteredWithdrawals = useMemo(() => {
    let result = withdrawals;
    if (wdSearch.trim()) {
      const q = wdSearch.toLowerCase();
      result = result.filter(
        (w) =>
          w.nomade?.user?.name?.toLowerCase().includes(q) ||
          w.nomade?.user?.email?.toLowerCase().includes(q) ||
          w.pix_key?.toLowerCase().includes(q)
      );
    }
    if (wdStatusFilter !== "all") result = result.filter((w) => w.status === wdStatusFilter);
    return result;
  }, [withdrawals, wdSearch, wdStatusFilter]);

  const filteredPartnerWithdrawals = useMemo(() => {
    let result = partnerWithdrawals;
    if (pwSearch.trim()) {
      const q = pwSearch.toLowerCase();
      result = result.filter(
        (w) =>
          w.partnerName?.toLowerCase().includes(q) ||
          w.partnerEmail?.toLowerCase().includes(q) ||
          w.pixKey?.toLowerCase().includes(q)
      );
    }
    if (pwStatusFilter !== "all") result = result.filter((w) => w.status === pwStatusFilter);
    return result;
  }, [partnerWithdrawals, pwSearch, pwStatusFilter]);

  const wdTotalPages = Math.max(1, Math.ceil(filteredWithdrawals.length / wdPerPage));
  const pagedWithdrawals = filteredWithdrawals.slice((wdPage - 1) * wdPerPage, wdPage * wdPerPage);

  const pwTotalPages = Math.max(1, Math.ceil(filteredPartnerWithdrawals.length / pwPerPage));
  const pagedPartnerWithdrawals = filteredPartnerWithdrawals.slice((pwPage - 1) * pwPerPage, pwPage * pwPerPage);

  // ── sorting ────────────────────────────────────────────────────────────────
  const { sortKey: invSK, sortDir: invSD, handleSort: handleInvSort, sortData: sortInvoices } = useSorting();
  const { sortKey: wSK,  sortDir: wSD,  handleSort: handleWSort,   sortData: sortWithdrawals } = useSorting();
  const { sortKey: pwSK, sortDir: pwSD, handleSort: handlePwSort, sortData: sortPartnerWithdrawals } = useSorting();
  const { sortKey: expSK, sortDir: expSD, handleSort: handleExpSort, sortData: sortExpenses } = useSorting();
  const { sortKey: waSK, sortDir: waSD, handleSort: handleWaSort, sortData: sortWalletsFn } = useSorting();
  const { sortKey: sqSK, sortDir: sqSD, handleSort: handleSqSort, sortData: sortSquad } = useSorting();
  const { sortKey: ccSK, sortDir: ccSD, handleSort: handleCcSort, sortData: sortConcil } = useSorting();

  const invTotalPages = Math.max(1, Math.ceil(invoiceTotal / invPerPage));
  const activeFilterCount = [invStatusFilter !== "all", periodActive].filter(Boolean).length;
  const wdActiveFilterCount = [wdStatusFilter !== "all"].filter(Boolean).length;

  function openFilterModal() {
    setDraftInvStatus(invStatusFilter);
    setDraftWdStatus(wdStatusFilter);
    setDraftExpStatus(expStatusFilter);
    setDraftExpCategory(expCategoryFilter);
    setDraftExpType(expTypeFilter);
    setDraftWalletType(walletTypeFilter);
    setDraftWalletStatus(walletStatusFilter);
    setFilterActiveTab(activeTab as any);
    setFilterOpen(true);
  }

  function applyFilters() {
    setInvStatusFilter(draftInvStatus);
    setWdStatusFilter(draftWdStatus);
    setExpStatusFilter(draftExpStatus);
    setExpCategoryFilter(draftExpCategory);
    setExpTypeFilter(draftExpType);
    setWalletTypeFilter(draftWalletType);
    setWalletStatusFilter(draftWalletStatus);
    setInvPage(1);
    setExpPage(1);
    setWalletPage(1);
    setFilterOpen(false);
  }

  function clearAllFilters() {
    setDraftInvStatus("all");
    setDraftWdStatus("all");
    setDraftExpStatus("all");
    setDraftExpCategory("all");
    setDraftExpType("all");
    setInvStatusFilter("all");
    setWdStatusFilter("all");
    setExpStatusFilter("all");
    setExpCategoryFilter("all");
    setExpTypeFilter("all");
    setDraftWalletType("all");
    setDraftWalletStatus("all");
    setWalletTypeFilter("all");
    setWalletStatusFilter("all");
    setDateRange(undefined);
    setInvPage(1);
    setExpPage(1);
    setWalletPage(1);
  }

  // ── invoice CRUD ───────────────────────────────────────────────────────────
  function openCreateSheet() {
    setEditingInvoice(null);
    setForm({ company_id: "", project_id: "", amount: "", status: "pending", due_date: "", description: "", invoice_number: "" });
    setSheetOpen(true);
  }

  function openEditSheet(inv) {
    setEditingInvoice(inv);
    setForm({
      company_id: inv.company_id || "", project_id: inv.project_id || "",
      amount: String(inv.amount || ""), status: inv.status || "pending",
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : "",
      description: inv.description || "", invoice_number: inv.invoice_number || "",
    });
    setSheetOpen(true);
  }

  async function handleSaveInvoice() {
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      toast({ title: "Informe um valor válido", variant: "destructive" }); return;
    }
    const payload: Record<string, any> = { amount: parseFloat(form.amount), status: form.status };
    if (form.company_id)    payload.company_id    = form.company_id;
    if (form.project_id)    payload.project_id    = form.project_id;
    if (form.due_date)      payload.due_date       = new Date(form.due_date).toISOString();
    if (form.description)   payload.description    = form.description;
    if (form.invoice_number) payload.invoice_number = form.invoice_number;
    setActionLoading("save");
    try {
      if (editingInvoice) {
        await apiClient.updateInvoice(editingInvoice.id, payload);
        toast({ title: "Fatura atualizada" });
      } else {
        await apiClient.createInvoice(payload);
        toast({ title: "Fatura criada" });
      }
      setSheetOpen(false); loadInvoices();
    } catch (err) {
      toast({ title: "Erro ao salvar fatura", description: err?.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  async function handleMarkPaid(id) {
    setActionLoading(id);
    try { await apiClient.updateInvoice(id, { status: "paid", paid_at: new Date().toISOString() }); toast({ title: "Marcada como paga" }); loadInvoices(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleMarkOverdue(id) {
    setActionLoading(id);
    try { await apiClient.updateInvoice(id, { status: "overdue" }); toast({ title: "Marcada como em atraso" }); loadInvoices(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleCancelInvoice(id) {
    setActionLoading(id);
    try { await apiClient.updateInvoice(id, { status: "cancelled" }); toast({ title: "Fatura cancelada" }); loadInvoices(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteInvoice() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try { await apiClient.deleteInvoice(deleteTarget); toast({ title: "Fatura excluída" }); setDeleteTarget(null); loadInvoices(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function approveWithdrawal(id) {
    setActionLoading(id);
    try { await apiClient.updateWithdrawal(id, { status: "pagamento_efetuado", notes: "Aprovado e pago" }); toast({ title: "Saque aprovado" }); loadWithdrawals(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function rejectWithdrawal(id) {
    setActionLoading(id);
    try { await apiClient.updateWithdrawal(id, { status: "reprovado", notes: rejectNote }); toast({ title: "Saque reprovado" }); setRejectingId(null); setRejectNote(""); loadWithdrawals(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  // ── partner withdrawal actions ──────────────────────────────────────────────
  // Saldo do Partner só é debitado no backend quando status vira "paid"
  // (dentro de uma transaction) — aprovar aqui NÃO paga, é só um sinalizador
  // intermediário antes do pagamento efetivo.
  async function approvePartnerWithdrawal(id) {
    setPwActionLoading(id);
    try { await apiClient.updateAdminPartnerWithdrawal(id, { status: "approved" }); toast({ title: "Saque aprovado" }); loadPartnerWithdrawals(); }
    catch (err: any) { toast({ title: "Erro ao aprovar", description: err?.message, variant: "destructive" }); }
    finally { setPwActionLoading(null); }
  }

  async function markPartnerWithdrawalPaid(id) {
    setPwActionLoading(id);
    try { await apiClient.updateAdminPartnerWithdrawal(id, { status: "paid" }); toast({ title: "Saque marcado como pago" }); loadPartnerWithdrawals(); }
    catch (err: any) { toast({ title: "Erro ao marcar como pago", description: err?.message, variant: "destructive" }); }
    finally { setPwActionLoading(null); }
  }

  async function rejectPartnerWithdrawal(id) {
    setPwActionLoading(id);
    try { await apiClient.updateAdminPartnerWithdrawal(id, { status: "rejected", notes: pwRejectNote }); toast({ title: "Saque reprovado" }); setPwRejectingId(null); setPwRejectNote(""); loadPartnerWithdrawals(); }
    catch (err: any) { toast({ title: "Erro ao reprovar", description: err?.message, variant: "destructive" }); }
    finally { setPwActionLoading(null); }
  }

  // ── expense CRUD ───────────────────────────────────────────────────────────
  function openCreateExpenseSheet() {
    setEditingExpense(null);
    setExpForm({ name: "", description: "", category: "Outros", amount: "", type: "fixa", recurrence: "mensal", status: "prevista", due_date: "", payment_method: "", department: "", competence_month: "", notes: "", is_recurring_base: false });
    setExpSheetOpen(true);
  }

  function openEditExpenseSheet(exp) {
    setEditingExpense(exp);
    setExpForm({
      name: exp.name || "", description: exp.description || "",
      category: exp.category || "Outros", amount: String(exp.amount || ""),
      type: exp.type || "fixa", recurrence: exp.recurrence || "mensal",
      status: exp.status || "prevista",
      due_date: exp.due_date ? exp.due_date.slice(0, 10) : "",
      payment_method: exp.payment_method || "", department: exp.department || "",
      competence_month: exp.competence_month || "", notes: exp.notes || "",
      is_recurring_base: exp.is_recurring_base || false,
    });
    setExpSheetOpen(true);
  }

  async function handleSaveExpense() {
    if (!expForm.name.trim()) { toast({ title: "Informe o nome da despesa", variant: "destructive" }); return; }
    if (!expForm.amount || isNaN(parseFloat(expForm.amount))) { toast({ title: "Informe um valor válido", variant: "destructive" }); return; }
    const payload: Record<string, any> = {
      name: expForm.name.trim(), category: expForm.category,
      amount: parseFloat(expForm.amount), type: expForm.type,
      recurrence: expForm.recurrence, status: expForm.status,
      is_recurring_base: expForm.is_recurring_base,
    };
    if (expForm.description)      payload.description      = expForm.description;
    if (expForm.due_date)         payload.due_date         = new Date(expForm.due_date).toISOString();
    if (expForm.payment_method)   payload.payment_method   = expForm.payment_method;
    if (expForm.department)       payload.department       = expForm.department;
    if (expForm.competence_month) payload.competence_month = expForm.competence_month;
    if (expForm.notes)            payload.notes            = expForm.notes;
    setActionLoading("exp-save");
    try {
      if (editingExpense) {
        await apiClient.updateExpense(editingExpense.id, payload);
        toast({ title: "Despesa atualizada" });
      } else {
        await apiClient.createExpense(payload);
        toast({ title: "Despesa criada" });
      }
      setExpSheetOpen(false); loadExpenses();
    } catch (err) {
      toast({ title: "Erro ao salvar despesa", description: err?.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  async function handleDeleteExpense() {
    if (!expDeleteTarget) return;
    setActionLoading(expDeleteTarget);
    try {
      await apiClient.deleteExpense(expDeleteTarget);
      toast({ title: "Despesa excluída" });
      setExpDeleteTarget(null); loadExpenses();
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleMarkExpensePaid(id) {
    setActionLoading(id);
    try { await apiClient.updateExpense(id, { status: "paga", paid_at: new Date().toISOString() }); toast({ title: "Marcada como paga" }); loadExpenses(); }
    catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  const expTotalPages = Math.max(1, Math.ceil(expenseTotal / expPerPage));
  const expActiveFilterCount = [expStatusFilter !== "all", expCategoryFilter !== "all", expTypeFilter !== "all"].filter(Boolean).length;

  // ── wallet loaders ─────────────────────────────────────────────────────────
  const walletPeriodFrom = walletDateRange?.from?.toISOString();
  const walletPeriodTo   = walletDateRange?.to?.toISOString();

  const loadWallets = useCallback(async () => {
    setWalletLoading(true);
    try {
      const filters: Record<string, any> = { limit: walletPerPage, page: walletPage };
      if (walletTypeFilter !== "all")   filters.owner_type = walletTypeFilter;
      if (walletStatusFilter !== "all") filters.status     = walletStatusFilter;
      if (walletSearch.trim())          filters.search     = walletSearch.trim();
      const statsParams: Record<string, any> = {};
      if (walletTypeFilter !== "all") statsParams.owner_type = walletTypeFilter;
      if (walletPeriodFrom) statsParams.from = walletPeriodFrom;
      if (walletPeriodTo)   statsParams.to   = walletPeriodTo;
      const [res, stats] = await Promise.all([
        apiClient.getWallets(filters),
        apiClient.getWalletStats(Object.keys(statsParams).length ? statsParams : undefined).catch(() => ({})),
      ]);
      setWallets(res.data || []);
      setWalletTotal(res.total || 0);
      setWalletStats(stats);
      // Projeções carregam de forma independente — não bloqueiam os dados principais
      apiClient.getWalletProjections({ days: walletHorizon })
        .then(setWalletProjections)
        .catch(() => setWalletProjections(null));
    } catch (err) { console.error("[Financeiro] wallets:", err); }
    finally { setWalletLoading(false); }
  }, [walletPage, walletPerPage, walletSearch, walletTypeFilter, walletStatusFilter, walletPeriodFrom, walletPeriodTo, walletHorizon]);

  useEffect(() => { if (activeTab === "carteiras") loadWallets(); }, [loadWallets, activeTab]);

  const loadLedger = useCallback(async (walletId: string) => {
    setLedgerLoading(true);
    try {
      const params: Record<string, any> = { page: ledgerPage, limit: 20 };
      if (ledgerDirFilter !== "all") params.direction = ledgerDirFilter;
      if (ledgerDateRange?.from) params.from = ledgerDateRange.from.toISOString();
      if (ledgerDateRange?.to)   params.to   = ledgerDateRange.to.toISOString();
      const res = await apiClient.getWalletLedger(walletId, params);
      setLedger(res.data || []);
      setLedgerTotal(res.total || 0);
      setLedgerSummary(res.summary || null);
    } catch (err) { console.error("[Financeiro] ledger:", err); }
    finally { setLedgerLoading(false); }
  }, [ledgerPage, ledgerDirFilter, ledgerDateRange]);

  useEffect(() => { if (selectedWallet && ledgerOpen) loadLedger(selectedWallet.id); }, [loadLedger, selectedWallet, ledgerOpen]);

  function openExtrato(wallet: any) {
    setSelectedWallet(wallet);
    setLedger([]);
    setLedgerPage(1);
    setLedgerDirFilter("all");
    setLedgerDateRange(undefined);
    setLedgerSummary(null);
    setLedgerOpen(true);
  }

  const loadGlobalLedger = useCallback(async () => {
    setGlobalLedgerLoading(true);
    try {
      const params: Record<string, any> = { page: globalLedgerPage, limit: 20 };
      if (globalLedgerType   !== "all") params.type           = globalLedgerType;
      if (globalLedgerDir    !== "all") params.direction      = globalLedgerDir;
      if (globalLedgerRefType !== "all") params.reference_type = globalLedgerRefType;
      const res = await apiClient.getWalletGlobalLedger(params);
      setGlobalLedger(res.data || []);
      setGlobalLedgerTotal(res.total || 0);
      setGlobalLedgerSummary(res.summary || null);
    } catch (err) { console.error("[Financeiro] global ledger:", err); }
    finally { setGlobalLedgerLoading(false); }
  }, [globalLedgerPage, globalLedgerType, globalLedgerDir, globalLedgerRefType]);

  useEffect(() => { if (globalLedgerOpen) loadGlobalLedger(); }, [loadGlobalLedger, globalLedgerOpen]);

  const globalLedgerTotalPages = Math.max(1, Math.ceil(globalLedgerTotal / 20));

  function openGlobalLedger(opts: { type?: string; direction?: string; refType?: string; title: string }) {
    setGlobalLedgerType(opts.type       || "all");
    setGlobalLedgerDir(opts.direction   || "all");
    setGlobalLedgerRefType(opts.refType || "all");
    setGlobalLedgerTitle(opts.title);
    setGlobalLedger([]);
    setGlobalLedgerPage(1);
    setGlobalLedgerSummary(null);
    setGlobalLedgerOpen(true);
  }

  function openProjectionsSheet(mode: "credits" | "debits") {
    setProjectionsMode(mode);
    setProjectionsOpen(true);
  }

  async function handleAdjustment() {
    if (!adjustWallet) return;
    if (!adjustForm.amount || isNaN(parseFloat(adjustForm.amount))) {
      toast({ title: "Informe um valor válido", variant: "destructive" }); return;
    }
    if (!adjustForm.description.trim()) {
      toast({ title: "Informe uma descrição", variant: "destructive" }); return;
    }
    setActionLoading("adj");
    try {
      await apiClient.createWalletAdjustment(adjustWallet.id, {
        direction:   adjustForm.direction,
        amount:      parseFloat(adjustForm.amount),
        description: adjustForm.description.trim(),
        notes:       adjustForm.notes,
        category:    "Ajuste",
      });
      toast({ title: `${adjustForm.direction === "credit" ? "Crédito" : "Débito"} lançado com sucesso` });
      setAdjustOpen(false);
      setAdjustForm({ direction: "credit", amount: "", description: "", notes: "" });
      loadWallets();
      if (ledgerOpen && selectedWallet?.id === adjustWallet.id) loadLedger(adjustWallet.id);
    } catch (err: any) {
      toast({ title: "Erro ao lançar ajuste", description: err?.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  const walletTotalPages = Math.max(1, Math.ceil(walletTotal / walletPerPage));
  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerTotal / 20));
  const walletActiveFilterCount = [walletTypeFilter !== "all", walletStatusFilter !== "all"].filter(Boolean).length;

  if (invLoading && invoices.length === 0 && wdLoading) return <PageLoader text="Carregando financeiro…" />;

  // Numbered gradient pagination — reused across every tab's bottom footer.
  const MiniPagination = ({ curPage, totalPages, onChange }) => {
    if (totalPages <= 1) return null;
    const getPageNumbers = () => {
      if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
      if (curPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
      if (curPage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      return [1, "...", curPage - 1, curPage, curPage + 1, "...", totalPages];
    };
    return (
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onChange(Math.max(1, curPage - 1))}
          disabled={curPage === 1}
          className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {getPageNumbers().map((pg, i) =>
          pg === "..." ? (
            <span key={i} className="text-xs text-slate-300 px-0.5">·</span>
          ) : (
            <button
              key={i}
              onClick={() => onChange(pg)}
              className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                pg === curPage
                  ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
              }`}
              style={pg === curPage ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
            >
              {pg}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, curPage + 1))}
          disabled={curPage === totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div ref={pageRef} className="space-y-4">

      <PageHeader
        title="Gestão Financeira"
        description="Gerencie faturas, recebimentos e saques da plataforma."
        actions={<>
          <ExportButton pageRef={pageRef} filename="financeiro" />
          {activeTab === "despesas" ? (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={openCreateExpenseSheet}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      Nova Despesa
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar nova despesa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={openCreateSheet}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      Nova Fatura
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar nova fatura</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>}
      />

      {/* ── KPI Cards — estilo idêntico a Projetos ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-sm border-2 border-emerald-300/70 dark:border-emerald-800/70 bg-gradient-to-br from-emerald-500 to-teal-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">Receita Recebida</p>
            <div className="bg-white/20 rounded-md p-1"><CheckCircle2 className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none tabular-nums">{fmt(kpi.paid)}</p>
          <p className="text-[10px] text-white/60 mt-0.5">{periodActive ? "No período selecionado" : "Faturas pagas"}</p>
        </div>

        <div className="relative rounded-xl overflow-hidden shadow-sm border-2 border-amber-300/70 dark:border-amber-800/70 bg-gradient-to-br from-amber-500 to-orange-600 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">A Receber</p>
            <div className="bg-white/20 rounded-md p-1"><Clock className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none tabular-nums">{fmt(kpi.pending)}</p>
          <p className="text-[10px] text-white/60 mt-0.5">{periodActive ? "No período selecionado" : "Faturas pendentes"}</p>
        </div>

        <div className="relative rounded-xl overflow-hidden shadow-sm border-2 border-red-300/70 dark:border-red-800/70 bg-gradient-to-br from-red-500 to-rose-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">Em Atraso</p>
            <div className="bg-white/20 rounded-md p-1"><AlertCircle className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none tabular-nums">{fmt(kpi.overdue)}</p>
          <p className="text-[10px] text-white/60 mt-0.5">{periodActive ? "No período selecionado" : "Faturas vencidas"}</p>
        </div>

        <div className="relative rounded-xl overflow-hidden shadow-sm border-2 border-violet-300/70 dark:border-violet-800/70 bg-gradient-to-br from-violet-500 to-purple-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              {periodActive ? "Ticket Médio" : "Saques Pendentes"}
            </p>
            <div className="bg-white/20 rounded-md p-1">
              {periodActive ? <TrendingUp className="h-4 w-4 text-white" /> : <Banknote className="h-4 w-4 text-white" />}
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none tabular-nums">
            {periodActive ? fmt(kpi.avgTicket) : wdPending}
          </p>
          <p className="text-[10px] text-white/60 mt-0.5">
            {periodActive ? `${kpi.invoiceCount} fat. pagas` : "Aguardando análise"}
          </p>
        </div>
      </div>

      {/* ── Relatório por Período — accordion igual ao de Estatísticas em Projetos ── */}
      <Accordion type="single" collapsible>
        <AccordionItem value="periodo" className="border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline px-4 py-3 hover:bg-blue-100/50 dark:hover:bg-blue-950/30 rounded-t-lg transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-300">Relatório por Período</span>
              {periodActive && (
                <span className="ml-2 text-[10px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">
                  Período ativo
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 px-4 pb-4">
            <AdvancedDateFilter
              dateRange={dateRange}
              onDateChange={(range) => { setDateRange(range); setInvPage(1); }}
              onReset={() => { setDateRange(undefined); setInvPage(1); }}
              isLoading={invLoading}
            />

            {/* DRE — Demonstrativo de Resultado do Exercício */}
            {periodActive && dreData && (
              <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">DRE — Demonstrativo de Resultado</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Receita */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-green-600 dark:text-green-400 font-bold mr-1">(+)</span>
                      Receita Bruta
                    </span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">{fmt(dreData.receita)}</span>
                  </div>
                  {/* Custos Diretos */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-red-500 font-bold mr-1">(–)</span>
                        Custos Diretos <span className="text-slate-400 text-xs">(CMV)</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 pl-4">Pagamentos de nômades efetuados</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">{fmt(dreData.custosDiretos)}</span>
                  </div>
                  {/* Lucro Bruto */}
                  <div className={`flex items-center justify-between px-4 py-3 ${dreData.lucroBruto >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Lucro Bruto</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dreData.margemBruta >= 0 ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}>
                        {dreData.margemBruta}%
                      </span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${dreData.lucroBruto >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{fmt(dreData.lucroBruto)}</span>
                  </div>
                  {/* Despesas Operacionais header */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-red-500 font-bold mr-1">(–)</span>
                        Despesas Operacionais
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">{fmt(dreData.despesasOperacionais)}</span>
                  </div>
                  {/* Breakdown por categoria */}
                  {(dreData.despesasPorCategoria || []).map((cat: any) => (
                    <div key={cat.category} className="flex items-center justify-between px-4 py-1.5 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-xs text-slate-500 dark:text-slate-400 pl-4 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-400 inline-block" />
                        {cat.category}
                        <span className="text-slate-400 text-[10px]">({cat.count})</span>
                      </span>
                      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">{fmt(cat.amount)}</span>
                    </div>
                  ))}
                  {/* Lucro Operacional */}
                  <div className={`flex items-center justify-between px-4 py-3 ${dreData.lucroOperacional >= 0 ? "bg-blue-50 dark:bg-blue-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Lucro Operacional</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dreData.margemOperacional >= 0 ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"}`}>
                        {dreData.margemOperacional}%
                      </span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${dreData.lucroOperacional >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>{fmt(dreData.lucroOperacional)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Faturas por status (collapse menor abaixo do DRE) */}
            {periodActive && billingStats && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(billingStats.byStatus || []).map((s) => (
                  <div key={s.status} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{INVOICE_STATUS_LABELS[s.status] || s.status}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(s.amount)}</p>
                    <p className="text-[10px] text-slate-400">{s.count} fatura{s.count !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Toolbar — idêntico ao de Projetos ──────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Tab switcher — mesmo visual que Lista / Kanban / Planejador */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 flex-shrink-0">
            <Button
              size="sm"
              variant={activeTab === "faturas" ? "default" : "ghost"}
              onClick={() => setActiveTab("faturas")}
              className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                activeTab === "faturas"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-background"
              }`}
            >
              <ReceiptText className="h-3 w-3 mr-1" />
              Faturas
              {invoiceTotal > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center",
                  activeTab === "faturas" ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {invoiceTotal}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === "saques" ? "default" : "ghost"}
              onClick={() => setActiveTab("saques")}
              className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                activeTab === "saques"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-background"
              }`}
            >
              <Users className="h-3 w-3 mr-1" />
              Saques
              {wdPending > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center",
                  activeTab === "saques" ? "bg-white/25 text-white" : "bg-violet-600 text-white"
                )}>
                  {wdPending}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === "despesas" ? "default" : "ghost"}
              onClick={() => setActiveTab("despesas")}
              className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                activeTab === "despesas"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-background"
              }`}
            >
              <Banknote className="h-3 w-3 mr-1" />
              Despesas
              {expenseTotal > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center",
                  activeTab === "despesas" ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {expenseTotal}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === "carteiras" ? "default" : "ghost"}
              onClick={() => setActiveTab("carteiras" as any)}
              className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                activeTab === "carteiras"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-background"
              }`}
            >
              <Wallet className="h-3 w-3 mr-1" />
              Carteiras
              {walletTotal > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center",
                  activeTab === "carteiras" ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {walletTotal}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === "squad" ? "default" : "ghost"}
              onClick={() => setActiveTab("squad" as any)}
              className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                activeTab === "squad"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-background"
              }`}
            >
              <Users className="h-3 w-3 mr-1" />
              Squad
              {(squadStats?.activeSquad ?? 0) > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center",
                  activeTab === "squad" ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {squadStats?.activeSquad}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={activeTab === "conciliacao" ? "default" : "ghost"}
              onClick={() => setActiveTab("conciliacao" as any)}
              className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                activeTab === "conciliacao"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                  : "hover:bg-background"
              }`}
            >
              <Landmark className="h-3 w-3 mr-1" />
              Conciliação
            </Button>
          </div>

          {/* Search + Items-per-page + Filtros compartilhados — na sub-aba
              "Partners" de Saques usamos uma barra própria dentro do card
              (ver "Tabela Saques" abaixo), então escondemos os controles
              aqui pra não parecer que eles filtram a tabela de Partners
              (eles continuam intactos e funcionando normalmente pra
              Nômades e para as demais abas). */}
          {!(activeTab === "saques" && wdSubTab === "partners") && (
            <>
          {/* Search */}
          <div className="flex-1 relative min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={activeTab === "faturas" ? "Buscar fatura, empresa..." : activeTab === "saques" ? "Buscar parceiro, PIX..." : activeTab === "despesas" ? "Buscar despesa, categoria..." : activeTab === "squad" ? "Buscar empresa Squad..." : activeTab === "conciliacao" ? "Buscar por descrição, titular..." : "Buscar carteira, titular, e-mail..."}
              value={activeTab === "faturas" ? invSearch : activeTab === "saques" ? wdSearch : activeTab === "despesas" ? expSearch : activeTab === "squad" ? squadSearch : activeTab === "conciliacao" ? concilSearch : walletSearch}
              onChange={(e) => { if (activeTab === "faturas") setInvSearch(e.target.value); else if (activeTab === "saques") setWdSearch(e.target.value); else if (activeTab === "despesas") { setExpSearch(e.target.value); setExpPage(1); } else if (activeTab === "squad") setSquadSearch(e.target.value); else if (activeTab === "conciliacao") { setConcilSearch(e.target.value); setConcilPage(1); } else { setWalletSearch(e.target.value); setWalletPage(1); } }}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Items per page + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={activeTab === "faturas" ? invPerPage.toString() : activeTab === "saques" ? wdPerPage.toString() : activeTab === "despesas" ? expPerPage.toString() : activeTab === "squad" ? squadPerPage.toString() : activeTab === "conciliacao" ? concilPerPage.toString() : walletPerPage.toString()}
              onValueChange={(v) => {
                if (activeTab === "faturas") { setInvPerPage(Number(v)); setInvPage(1); }
                else if (activeTab === "saques") { setWdPerPage(Number(v)); setWdPage(1); }
                else if (activeTab === "despesas") { setExpPerPage(Number(v)); setExpPage(1); }
                else if (activeTab === "squad") { setSquadPerPage(Number(v)); }
                else if (activeTab === "conciliacao") { setConcilPerPage(Number(v)); setConcilPage(1); }
                else { setWalletPerPage(Number(v)); setWalletPage(1); }
              }}
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {activeTab === "faturas" ? (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{invoiceTotal}</span> fatura{invoiceTotal !== 1 ? "s" : ""}</>
              ) : activeTab === "saques" ? (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{filteredWithdrawals.length}</span> saque{filteredWithdrawals.length !== 1 ? "s" : ""}</>
              ) : activeTab === "despesas" ? (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{expenseTotal}</span> despesa{expenseTotal !== 1 ? "s" : ""}</>
              ) : activeTab === "squad" ? (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{squadList.length}</span> empresa{squadList.length !== 1 ? "s" : ""}</>
              ) : activeTab === "conciliacao" ? (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{concilTotal}</span> transaç{concilTotal !== 1 ? "ões" : "ão"}</>
              ) : (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{walletTotal}</span> carteira{walletTotal !== 1 ? "s" : ""}</>
              )}
            </span>
          </div>

          {/* Filtros — só nas abas com filtros próprios no modal compartilhado;
              Squad não tem filtros e Conciliação já tem sua própria barra de
              filtros inline (Origem/Impacto/Tipo/Período), então o modal
              compartilhado não tem seção pra elas. */}
          {(activeTab === "faturas" || activeTab === "saques" || activeTab === "despesas" || activeTab === "carteiras") && (() => {
            const cnt = activeTab === "faturas" ? activeFilterCount : activeTab === "saques" ? wdActiveFilterCount : activeTab === "despesas" ? expActiveFilterCount : walletActiveFilterCount;
            return (
              <IconToolbarButton
                icon={Filter}
                tooltip={cnt > 0 ? `Filtros (${cnt} ativos)` : "Filtros"}
                onClick={openFilterModal}
                className={cnt > 0 ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : undefined}
              />
            );
          })()}
            </>
          )}

          {/* Configurar colunas — Faturas */}
          {activeTab === "faturas" && (
            <IconToolbarButton
              icon={Columns3}
              tooltip="Configurar colunas"
              onClick={() => setColumnsPanelOpen(true)}
            />
          )}

          {/* Horizontal scrollbar mirror — shared across tabs, only when the
              active tab's table actually overflows its container. */}
          {hasHorizontalOverflow && (
            <div
              ref={topScrollRef}
              onScroll={handleTopBarScroll}
              title="Arraste para rolar a tabela na horizontal"
              className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
              style={{ height: 12 }}
            >
              <div style={{ minWidth: 900, height: 1 }} />
            </div>
          )}

          {/* Cog */}
          <Popover open={colConfigOpen} onOpenChange={setColConfigOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "group relative flex items-center justify-center h-11 w-11 rounded-[12px] border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden transition-all flex-shrink-0",
                  colConfigOpen && "border-transparent"
                )}
                title="Opções"
              >
                <span
                  className={cn(
                    "absolute inset-0 transition-opacity pointer-events-none",
                    colConfigOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                />
                <Cog className={cn(
                  "relative z-10 h-5 w-5 transition-colors",
                  colConfigOpen ? "text-white" : "text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white"
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-2 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2 py-1">Ações rápidas</p>
              <button onClick={() => { loadInvoices(); loadWithdrawals(); if (activeTab === "despesas") loadExpenses(); }}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Atualizar dados
              </button>
              {activeTab === "faturas" && (
                <>
                  <button onClick={() => { setInvStatusFilter("all"); setDateRange(undefined); setInvSearch(""); }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Limpar filtros
                  </button>
                  <button onClick={openCreateSheet}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Nova fatura
                  </button>
                </>
              )}
              {activeTab === "saques" && (
                <button onClick={() => { setWdStatusFilter("all"); setWdSearch(""); }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  Limpar filtros
                </button>
              )}
              {activeTab === "despesas" && (
                <>
                  <button onClick={() => { setExpStatusFilter("all"); setExpCategoryFilter("all"); setExpTypeFilter("all"); setExpSearch(""); setExpPage(1); }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Limpar filtros
                  </button>
                  <button onClick={openCreateExpenseSheet}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Nova despesa
                  </button>
                </>
              )}
              {activeTab === "carteiras" && (
                <>
                  <button onClick={() => { setWalletTypeFilter("all"); setWalletStatusFilter("all"); setWalletSearch(""); setWalletPage(1); }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Limpar filtros
                  </button>
                  <button onClick={loadWallets}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Atualizar carteiras
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>

          {/* Pagination — só as abas com paginação central (squad/conciliação têm paginador próprio embaixo; Partners também tem o seu, dentro do card) */}
          {(activeTab === "faturas" || (activeTab === "saques" && wdSubTab === "nomades") || activeTab === "despesas" || activeTab === "carteiras") && (
            <div className="ml-auto">
              <MiniPagination
                curPage={activeTab === "faturas" ? invPage : activeTab === "saques" ? wdPage : activeTab === "despesas" ? expPage : walletPage}
                totalPages={activeTab === "faturas" ? invTotalPages : activeTab === "saques" ? wdTotalPages : activeTab === "despesas" ? expTotalPages : walletTotalPages}
                onChange={activeTab === "faturas" ? setInvPage : activeTab === "saques" ? setWdPage : activeTab === "despesas" ? setExpPage : setWalletPage}
              />
            </div>
          )}
        </div>

        {/* ── Tabela Faturas ──────────────────────────────────────── */}
        {activeTab === "faturas" && (
          <Card className="overflow-hidden">
            <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
              <table className="w-full text-sm min-w-[600px]">
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      <SortableHeader label="Nº / Descrição" field="invoice_number" type="text" sortKey={invSK ? String(invSK) : null} sortDir={invSD} onSort={handleInvSort} />
                    </th>
                    {invVisibleCols.has("empresa") && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>
                    )}
                    {invVisibleCols.has("projeto") && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Projeto</th>
                    )}
                    {invVisibleCols.has("valor") && (
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        <SortableHeader label="Valor" field="amount" type="number" sortKey={invSK ? String(invSK) : null} sortDir={invSD} onSort={handleInvSort} />
                      </th>
                    )}
                    {invVisibleCols.has("vencimento") && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        <SortableHeader label="Vencimento" field="due_date" type="date" sortKey={invSK ? String(invSK) : null} sortDir={invSD} onSort={handleInvSort} />
                      </th>
                    )}
                    {invVisibleCols.has("status") && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    )}
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      style={{ position: "sticky", right: 0, top: 0, zIndex: 3, minWidth: 132, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invLoading ? (
                    <tr><td colSpan={invVisibleCols.size + 2} className="py-12 text-center text-sm text-slate-400">Carregando faturas…</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={invVisibleCols.size + 2} className="py-16 text-center text-sm text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <ReceiptText className="h-8 w-8 opacity-30" />
                          <p>Nenhuma fatura encontrada</p>
                          <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreateSheet}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira fatura
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortInvoices(filteredInvoices).map((inv, idx) => {
                      const isOverdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();
                      return (
                        <tr key={inv.id} className={idx % 2 === 0
                          ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                          : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{inv.invoice_number || <span className="text-slate-400">—</span>}</p>
                            {inv.description && <p className="text-[11px] text-slate-400 mt-0.5 max-w-[180px] truncate">{inv.description}</p>}
                          </td>
                          {invVisibleCols.has("empresa") && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{inv.company?.name || "—"}</span>
                              </div>
                            </td>
                          )}
                          {invVisibleCols.has("projeto") && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[140px] truncate">{inv.project?.title || "—"}</span>
                              </div>
                            </td>
                          )}
                          {invVisibleCols.has("valor") && (
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200">{fmt(inv.amount)}</td>
                          )}
                          {invVisibleCols.has("vencimento") && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>{fmtDate(inv.due_date)}</span>
                              </div>
                              {inv.paid_at && <p className="text-[10px] text-emerald-600 mt-0.5">Pago em {fmtDate(inv.paid_at)}</p>}
                            </td>
                          )}
                          {invVisibleCols.has("status") && (
                            <td className="px-4 py-3">
                              <NeonBadge color={INVOICE_STATUS_COLOR[inv.status] || "slate"}>
                                {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                              </NeonBadge>
                            </td>
                          )}
                          <td
                            className={idx % 2 === 0
                              ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                              : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                            style={{ position: "sticky", right: 0, zIndex: 1, minWidth: 132, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {(inv.status === "pending" || inv.status === "overdue") && (
                                <button disabled={actionLoading === inv.id} onClick={() => handleMarkPaid(inv.id)} title="Marcar como pago"
                                  className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-emerald-600 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                              {inv.status === "pending" && (
                                <button disabled={actionLoading === inv.id} onClick={() => handleMarkOverdue(inv.id)} title="Marcar em atraso"
                                  className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-amber-600 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <AlertCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => openEditSheet(inv)} title="Editar"
                                className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-slate-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {inv.status !== "paid" && inv.status !== "cancelled" ? (
                                <button disabled={actionLoading === inv.id} onClick={() => handleCancelInvoice(inv.id)} title="Cancelar"
                                  className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <XCircle className="h-4 w-4" />
                                </button>
                              ) : (
                                <button disabled={actionLoading === inv.id} onClick={() => setDeleteTarget(inv.id)} title="Excluir"
                                  className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 shrink-0">{invoiceTotal} fatura{invoiceTotal !== 1 ? "s" : ""}</p>
              {hasHorizontalOverflow && (
                <div ref={bottomScrollRef} onScroll={handleBottomBarScroll} title="Arraste para rolar a tabela na horizontal" className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center">
                  <div style={{ minWidth: 900, height: 1 }} />
                </div>
              )}
              <MiniPagination curPage={invPage} totalPages={invTotalPages} onChange={setInvPage} />
            </div>
          </Card>
        )}

        {/* ── Sub-abas Saques: Nômades | Partners ──────────────────── */}
        {/* Fluxos independentes e com endpoints diferentes — Nômades usa
            /financial/withdrawals (WithdrawalRequest), Partners usa
            /partners/admin/withdrawals (PartnerWithdrawal). Nunca misturados
            na mesma tabela pra não confundir qual regra de saldo se aplica. */}
        {activeTab === "saques" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWdSubTab("nomades")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border",
                wdSubTab === "nomades"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
              )}
            >
              Nômades
              {wdPending > 0 && <span className="opacity-70">({wdPending})</span>}
            </button>
            <button
              onClick={() => setWdSubTab("partners")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border",
                wdSubTab === "partners"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
              )}
            >
              Partners
              {pwPending > 0 && <span className="opacity-70">({pwPending})</span>}
            </button>
          </div>
        )}

        {/* ── Tabela Saques (Nômades) ───────────────────────────────── */}
        {activeTab === "saques" && wdSubTab === "nomades" && (
          <Card className="overflow-hidden">
            {/* Chips de status */}
            <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
              {[
                { label: "Aguardando", status: "aguardando_analise", color: "text-amber-600" },
                { label: "Agendado",   status: "pagamento_agendado", color: "text-blue-600" },
                { label: "Pago",       status: "pagamento_efetuado", color: "text-emerald-600" },
                { label: "Reprovado",  status: "reprovado",          color: "text-red-500" },
              ].map(({ label, status, color }) => {
                const count  = withdrawals.filter((w) => w.status === status).length;
                const amount = withdrawals.filter((w) => w.status === status).reduce((s, w) => s + (w.amount || 0), 0);
                if (count === 0) return null;
                return (
                  <button key={status}
                    onClick={() => setWdStatusFilter(wdStatusFilter === status ? "all" : status)}
                    className={cn(
                      "flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs transition-colors",
                      wdStatusFilter === status
                        ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                        : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 ${color}`
                    )}>
                    <span className="font-semibold">{count} {label}</span>
                    {amount > 0 && <span className="opacity-60">· {fmt(amount)}</span>}
                  </button>
                );
              })}
              {wdStatusFilter !== "all" && (
                <button onClick={() => setWdStatusFilter("all")}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>

            <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
              <table className="w-full text-sm min-w-[600px]">
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Parceiro" field="nomade" type="text" sortKey={wSK ? String(wSK) : null} sortDir={wSD} onSort={handleWSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave PIX</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Valor" field="amount" type="number" sortKey={wSK ? String(wSK) : null} sortDir={wSD} onSort={handleWSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Solicitado em" field="created_at" type="date" sortKey={wSK ? String(wSK) : null} sortDir={wSD} onSort={handleWSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      style={{ position: "sticky", right: 0, top: 0, zIndex: 3, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wdLoading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Carregando saques…</td></tr>
                  ) : pagedWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="h-8 w-8 opacity-30" />
                          <p>Nenhuma solicitação encontrada</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortWithdrawals(pagedWithdrawals).map((w, idx) => (
                      <tr key={w.id} className={idx % 2 === 0
                        ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                        : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{w.nomade?.user?.name || "—"}</p>
                          <p className="text-[11px] text-slate-400">{w.nomade?.user?.email || ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{w.pix_key || "—"}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{w.pix_key_type || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200">{fmt(w.amount || 0)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(w.created_at)}</td>
                        <td className="px-4 py-3">
                          <NeonBadge color={WD_STATUS_COLOR[w.status] || "slate"}>
                            {WD_STATUS_LABELS[w.status] || w.status}
                          </NeonBadge>
                          {w.notes && w.status === "reprovado" && (
                            <p className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] truncate">{w.notes}</p>
                          )}
                        </td>
                        <td
                          className={idx % 2 === 0
                            ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                            : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                          style={{ position: "sticky", right: 0, zIndex: 1, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                        >
                          {w.status === "aguardando_analise" ? (
                            rejectingId === w.id ? (
                              <div className="flex gap-1.5 items-center">
                                <input autoFocus
                                  className="h-7 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 w-32 focus:outline-none"
                                  placeholder="Motivo…" value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)} />
                                <button onClick={() => rejectWithdrawal(w.id)} className="h-7 px-2 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">OK</button>
                                <button onClick={() => { setRejectingId(null); setRejectNote(""); }} className="h-7 px-2 rounded border border-slate-200 dark:border-slate-600 text-slate-500 text-xs">X</button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <button disabled={actionLoading === w.id} onClick={() => approveWithdrawal(w.id)}
                                  className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40">
                                  <UserCheck className="h-3 w-3" /> Aprovar
                                </button>
                                <button onClick={() => setRejectingId(w.id)}
                                  className="h-7 px-2.5 rounded-md border border-red-300 dark:border-red-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-semibold flex items-center gap-1 transition-colors">
                                  <XCircle className="h-3 w-3" /> Reprovar
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 shrink-0">{filteredWithdrawals.length} solicitação{filteredWithdrawals.length !== 1 ? "ões" : ""}</p>
              {hasHorizontalOverflow && (
                <div ref={bottomScrollRef} onScroll={handleBottomBarScroll} title="Arraste para rolar a tabela na horizontal" className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center">
                  <div style={{ minWidth: 900, height: 1 }} />
                </div>
              )}
              <MiniPagination curPage={wdPage} totalPages={wdTotalPages} onChange={setWdPage} />
            </div>
          </Card>
        )}

        {/* ── Tabela Saques (Partners) ──────────────────────────────── */}
        {/* Regra de saldo: NUNCA debitado ao solicitar. Só é debitado quando
            o admin marca como "Pago" (backend faz isso dentro de uma
            transaction e bloqueia reprocessar um saque já terminal). */}
        {activeTab === "saques" && wdSubTab === "partners" && (
          <Card className="overflow-hidden">
            {/* Busca própria + chips de status */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 min-w-0 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar parceiro, e-mail, PIX..."
                  value={pwSearch}
                  onChange={(e) => { setPwSearch(e.target.value); setPwPage(1); }}
                  className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
                />
              </div>
              {[
                { label: "Aguardando", status: "pending" },
                { label: "Aprovado",   status: "approved" },
                { label: "Pago",       status: "paid" },
                { label: "Reprovado",  status: "rejected" },
                { label: "Cancelado",  status: "cancelled" },
              ].map(({ label, status }) => {
                const count = partnerWithdrawals.filter((w) => w.status === status).length;
                if (count === 0) return null;
                return (
                  <button key={status}
                    onClick={() => { setPwStatusFilter(pwStatusFilter === status ? "all" : status); setPwPage(1); }}
                    className={cn(
                      "flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs transition-colors",
                      pwStatusFilter === status
                        ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    )}>
                    <span className="font-semibold">{count} {label}</span>
                  </button>
                );
              })}
              {pwStatusFilter !== "all" && (
                <button onClick={() => setPwStatusFilter("all")}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <ItemsPerPageSelect value={pwPerPage.toString()} onValueChange={(v) => { setPwPerPage(Number(v)); setPwPage(1); }} />
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  de <span className="font-semibold text-slate-600 dark:text-slate-300">{filteredPartnerWithdrawals.length}</span> saque{filteredPartnerWithdrawals.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto allka-table-scroll-body">
              <table className="w-full text-sm min-w-[700px]">
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Partner" field="partnerName" type="text" sortKey={pwSK ? String(pwSK) : null} sortDir={pwSD} onSort={handlePwSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave PIX</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Valor" field="amount" type="number" sortKey={pwSK ? String(pwSK) : null} sortDir={pwSD} onSort={handlePwSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Solicitado em" field="requestedAt" type="date" sortKey={pwSK ? String(pwSK) : null} sortDir={pwSD} onSort={handlePwSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Processado em</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      style={{ position: "sticky", right: 0, top: 0, zIndex: 3, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pwLoading ? (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Carregando saques…</td></tr>
                  ) : pagedPartnerWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="h-8 w-8 opacity-30" />
                          <p>Nenhuma solicitação de Partner encontrada</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortPartnerWithdrawals(pagedPartnerWithdrawals).map((w, idx) => (
                      <tr key={w.id} className={idx % 2 === 0
                        ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                        : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{w.partnerName || "—"}</p>
                          <p className="text-[11px] text-slate-400">{w.partnerEmail || ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{w.pixKey || "—"}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{w.pixKeyType || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200">{fmt(w.amount || 0)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(w.requestedAt)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{w.paidAt ? fmtDateTime(w.paidAt) : "—"}</td>
                        <td className="px-4 py-3">
                          <NeonBadge color={PARTNER_WD_STATUS_COLOR[w.status] || "slate"}>
                            {PARTNER_WD_STATUS_LABELS[w.status] || w.status}
                          </NeonBadge>
                          {w.notes && w.status === "rejected" && (
                            <p className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] truncate">{w.notes}</p>
                          )}
                        </td>
                        <td
                          className={idx % 2 === 0
                            ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                            : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                          style={{ position: "sticky", right: 0, zIndex: 1, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                        >
                          {(w.status === "pending" || w.status === "approved") ? (
                            pwRejectingId === w.id ? (
                              <div className="flex gap-1.5 items-center">
                                <input autoFocus
                                  className="h-7 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 w-32 focus:outline-none"
                                  placeholder="Motivo…" value={pwRejectNote}
                                  onChange={(e) => setPwRejectNote(e.target.value)} />
                                <button onClick={() => rejectPartnerWithdrawal(w.id)} className="h-7 px-2 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">OK</button>
                                <button onClick={() => { setPwRejectingId(null); setPwRejectNote(""); }} className="h-7 px-2 rounded border border-slate-200 dark:border-slate-600 text-slate-500 text-xs">X</button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                {w.status === "pending" && (
                                  <button disabled={pwActionLoading === w.id} onClick={() => approvePartnerWithdrawal(w.id)}
                                    className="h-7 px-2.5 rounded-md border border-blue-300 dark:border-blue-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40">
                                    <UserCheck className="h-3 w-3" /> Aprovar
                                  </button>
                                )}
                                <button disabled={pwActionLoading === w.id} onClick={() => markPartnerWithdrawalPaid(w.id)}
                                  className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40">
                                  <Banknote className="h-3 w-3" /> Marcar pago
                                </button>
                                <button onClick={() => setPwRejectingId(w.id)}
                                  className="h-7 px-2.5 rounded-md border border-red-300 dark:border-red-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-semibold flex items-center gap-1 transition-colors">
                                  <XCircle className="h-3 w-3" /> Reprovar
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 shrink-0">{filteredPartnerWithdrawals.length} solicitação{filteredPartnerWithdrawals.length !== 1 ? "ões" : ""}</p>
              <MiniPagination curPage={pwPage} totalPages={pwTotalPages} onChange={setPwPage} />
            </div>
          </Card>
        )}

        {/* ── Despesas Tab ─────────────────────────────────────────── */}
        {activeTab === "despesas" && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: "Total Geral",  value: expStats?.total     ?? 0, sub: `${expStats?.count ?? 0} despesa${(expStats?.count ?? 0) !== 1 ? "s" : ""}`, from: "from-slate-600",   to: "to-slate-800" },
                { label: "Pagas",        value: expStats?.paid      ?? 0, sub: "Quitadas",       from: "from-emerald-500", to: "to-teal-700" },
                { label: "Pendentes",    value: expStats?.pending   ?? 0, sub: "A pagar",         from: "from-amber-500",   to: "to-orange-600" },
                { label: "Atrasadas",    value: expStats?.overdue   ?? 0, sub: "Vencidas",        from: "from-red-500",     to: "to-rose-700" },
                { label: "Fixas",        value: expStats?.fixed     ?? 0, sub: "Despesas fixas",  from: "from-blue-500",    to: "to-indigo-700" },
                { label: "Variáveis",    value: expStats?.variable  ?? 0, sub: "Despesas variáveis", from: "from-violet-500", to: "to-purple-700" },
              ].map(({ label, value, sub, from, to }) => (
                <div key={label} className={`relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br ${from} ${to} px-3 pt-2 pb-1.5`}>
                  <p className="text-xs font-medium text-white/70 leading-tight mb-1">{label}</p>
                  <p className="text-xl font-bold text-white leading-none tabular-nums">{fmt(value)}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              {/* Status chips */}
              <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                {([
                  { label: "Prevista",  status: "prevista",  color: "text-slate-600" },
                  { label: "Pendente",  status: "pendente",  color: "text-amber-600" },
                  { label: "Paga",      status: "paga",      color: "text-emerald-600" },
                  { label: "Atrasada",  status: "atrasada",  color: "text-red-600" },
                  { label: "Cancelada", status: "cancelada", color: "text-slate-400" },
                ] as const).map(({ label, status, color }) => {
                  const row = expStats?.byStatus?.find((s) => s.status === status);
                  if (!row || row.count === 0) return null;
                  return (
                    <button key={status}
                      onClick={() => { setExpStatusFilter(expStatusFilter === status ? "all" : status); setExpPage(1); }}
                      className={cn("flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs transition-colors",
                        expStatusFilter === status
                          ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                          : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 ${color}`)}>
                      <span className="font-semibold">{row.count} {label}</span>
                      <span className="opacity-60">· {fmt(row.amount)}</span>
                    </button>
                  );
                })}
                {expStatusFilter !== "all" && (
                  <button onClick={() => { setExpStatusFilter("all"); setExpPage(1); }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <X className="h-3 w-3" /> Limpar
                  </button>
                )}
              </div>

              <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
                <table className="w-full text-sm min-w-[600px]">
                  <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Nome" field="name" type="text" sortKey={expSK ? String(expSK) : null} sortDir={expSD} onSort={handleExpSort} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Competência</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Vencimento" field="due_date" type="date" sortKey={expSK ? String(expSK) : null} sortDir={expSD} onSort={handleExpSort} />
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Valor" field="amount" type="number" sortKey={expSK ? String(expSK) : null} sortDir={expSD} onSort={handleExpSort} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th
                        className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ position: "sticky", right: 0, top: 0, zIndex: 3, minWidth: 108, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expLoading ? (
                      <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Carregando despesas…</td></tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Banknote className="h-8 w-8 opacity-30" />
                            <p>Nenhuma despesa cadastrada</p>
                            <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreateExpenseSheet}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar primeira despesa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortExpenses(expenses).map((exp, idx) => {
                        const isOverdue = exp.status === "pendente" && exp.due_date && new Date(exp.due_date) < new Date();
                        return (
                          <tr key={exp.id} className={idx % 2 === 0
                            ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                            : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{exp.name}</p>
                              {exp.description && <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] truncate">{exp.description}</p>}
                              {exp.payment_method && <p className="text-[10px] text-slate-400 mt-0.5">{exp.payment_method}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-slate-600 dark:text-slate-400">{exp.category}</span>
                            </td>
                            <td className="px-4 py-3">
                              <NeonBadge color={exp.type === "fixa" ? "blue" : "violet"}>
                                {exp.type === "fixa" ? "Fixa" : "Variável"}
                              </NeonBadge>
                              {exp.recurrence !== "única" && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{exp.recurrence}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{exp.competence_month || "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>{fmtDate(exp.due_date)}</span>
                              {exp.paid_at && <p className="text-[10px] text-emerald-600 mt-0.5">Pago em {fmtDate(exp.paid_at)}</p>}
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200">{fmt(exp.amount)}</td>
                            <td className="px-4 py-3">
                              <NeonBadge color={EXP_STATUS_COLOR[exp.status] || "slate"}>
                                {EXP_STATUS_LABELS[exp.status] || exp.status}
                              </NeonBadge>
                            </td>
                            <td
                              className={idx % 2 === 0
                                ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                                : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                              style={{ position: "sticky", right: 0, zIndex: 1, minWidth: 108, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {(exp.status === "pendente" || exp.status === "prevista" || exp.status === "atrasada") && (
                                  <button disabled={actionLoading === exp.id} onClick={() => handleMarkExpensePaid(exp.id)} title="Marcar como paga"
                                    className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-emerald-600 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                )}
                                <button onClick={() => openEditExpenseSheet(exp)} title="Editar"
                                  className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-slate-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button disabled={actionLoading === exp.id} onClick={() => setExpDeleteTarget(exp.id)} title="Excluir"
                                  className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 shrink-0">{expenseTotal} despesa{expenseTotal !== 1 ? "s" : ""}</p>
                {hasHorizontalOverflow && (
                  <div ref={bottomScrollRef} onScroll={handleBottomBarScroll} title="Arraste para rolar a tabela na horizontal" className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center">
                    <div style={{ minWidth: 900, height: 1 }} />
                  </div>
                )}
                <MiniPagination curPage={expPage} totalPages={expTotalPages} onChange={setExpPage} />
              </div>
            </Card>
          </>
        )}

        {/* ── Carteiras Tab ────────────────────────────────────────── */}
        {activeTab === "carteiras" && (
          <>
            {/* ── Filtro de período para os widgets ─────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Período dos widgets:</span>
              </div>
              <AdvancedDateFilter
                dateRange={walletDateRange}
                onDateChange={(r) => { setWalletDateRange(r); }}
                onReset={() => setWalletDateRange(undefined)}
                isLoading={walletLoading}
              />
              {walletDateRange && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                  Período ativo
                </span>
              )}
            </div>

            {/* ── 1. Resumo Geral ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Saldo Total",    value: walletStats?.totalBalance  ?? 0, sub: `${walletStats?.walletCount ?? 0} carteiras`, from: "from-blue-600",   to: "to-indigo-800",  icon: <Wallet className="h-4 w-4 text-white/60" /> },
                { label: "Saldo Bloqueado",value: walletStats?.blockedBalance ?? 0, sub: "Em análise/restrição",                       from: "from-amber-500",  to: "to-orange-700",  icon: <Info className="h-4 w-4 text-white/60" /> },
                { label: "Carteiras Ativas",value: walletStats?.activeCount  ?? 0, sub: `${walletStats?.suspendedCount ?? 0} suspensas`, from: "from-violet-500", to: "to-purple-700",  icon: <Layers className="h-4 w-4 text-white/60" />, isMoney: false },
                { label: "Saldo Líquido",  value: (walletStats?.credits ?? 0) - (walletStats?.debits ?? 0), sub: walletDateRange ? "Créditos − Débitos no período" : "Créditos − Débitos (total)", from: "from-slate-600", to: "to-slate-800", icon: <TrendingUp className="h-4 w-4 text-white/60" /> },
              ].map(({ label, value, sub, from, to, icon, isMoney = true }) => (
                <div key={label} className={`relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br ${from} ${to} px-4 pt-3 pb-2.5`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-white/70 leading-tight">{label}</p>
                    {icon}
                  </div>
                  <p className="text-2xl font-bold text-white leading-none tabular-nums">{isMoney ? fmt(value) : value}</p>
                  <p className="text-[10px] text-white/60 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── 2. Movimentações por tipo ──────────────────────────── */}
            <div className="space-y-2">
              {/* Créditos */}
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Créditos {walletDateRange ? "no período" : "(total geral)"}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: "Total Créditos",       value: walletStats?.credits         ?? 0, count: walletStats?.creditCount          ?? 0, color: "border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20", badge: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400", icon: <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, onClick: () => openGlobalLedger({ direction: "credit", title: "Créditos — todos" }), tooltip: "Total de entradas nas carteiras no período" },
                  { label: "Bônus",                value: walletStats?.bonus            ?? 0, count: walletStats?.bonusCount            ?? 0, color: "border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20",        badge: "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400",       icon: <Gift className="h-4 w-4 text-pink-600 dark:text-pink-400" />,              onClick: () => openGlobalLedger({ type: "bonus", direction: "credit", title: "Bônus concedidos" }), tooltip: "Bônus manuais, promocionais e de ativação" },
                  { label: "Crédito adicional",    value: walletStats?.additionalCredit ?? 0, count: walletStats?.additionalCreditCount ?? 0, color: "border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20",         badge: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",       icon: <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />,        onClick: () => openGlobalLedger({ type: "adjustment", direction: "credit", title: "Créditos adicionais" }), tooltip: "Ajustes positivos, recargas e créditos manuais" },
                  { label: "Plano",                value: walletStats?.planCredits      ?? 0, count: walletStats?.planCreditCount      ?? 0, color: "border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20",   badge: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400", icon: <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />,    onClick: () => openGlobalLedger({ refType: "invoice", direction: "credit", title: "Entradas de planos" }), tooltip: "Pagamentos de assinatura e renovação de planos" },
                  { label: "Projetos recorrentes", value: walletStats?.recurringCredits ?? 0, count: walletStats?.recurringCreditCount ?? 0, color: "border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20",         badge: "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400",       icon: <Repeat2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />,           onClick: () => openGlobalLedger({ refType: "project", direction: "credit", title: "Projetos recorrentes" }), tooltip: "Pagamentos de projetos com ciclo mensal/recorrente" },
                  { label: "Comissões",            value: walletStats?.commissions      ?? 0, count: walletStats?.commissionCount      ?? 0, color: "border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20",       badge: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",   icon: <Banknote className="h-4 w-4 text-amber-600 dark:text-amber-400" />,        onClick: () => openGlobalLedger({ type: "commission", direction: "credit", title: "Comissões recebidas" }), tooltip: "Comissões de agências, partners e indicações" },
                ].map(({ label, value, count, color, badge, icon, onClick, tooltip }) => (
                  <button key={label} onClick={onClick} title={tooltip}
                    className={`group relative text-left rounded-xl border-2 bg-white dark:bg-slate-900 ${color} p-3 transition-all shadow-sm hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-2">
                      {icon}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge}`}>crédito</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">{fmt(value)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{count} transação{count !== 1 ? "ões" : ""}</p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Ver detalhes →</p>
                  </button>
                ))}
              </div>

              {/* Débitos */}
              <div className="flex items-center gap-2 mt-1">
                <ArrowDownCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Débitos {walletDateRange ? "no período" : "(total geral)"}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Saídas totais", value: walletStats?.debits     ?? 0, count: walletStats?.debitCount      ?? 0, color: "border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20",    badge: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",    icon: <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />,     onClick: () => openGlobalLedger({ direction: "debit", title: "Saídas — todas" }), tooltip: "Total de saídas das carteiras, incluindo saques" },
                  { label: "Saques",        value: walletStats?.withdrawals ?? 0, count: walletStats?.withdrawalCount ?? 0, color: "border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20", badge: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400", icon: <ArrowDownRight className="h-4 w-4 text-rose-500 dark:text-rose-400" />, onClick: () => openGlobalLedger({ type: "withdrawal", direction: "debit", title: "Saques realizados" }), tooltip: "Saques aprovados e concluídos no período" },
                ].map(({ label, value, count, color, badge, icon, onClick, tooltip }) => (
                  <button key={label} onClick={onClick} title={tooltip}
                    className={`group relative text-left rounded-xl border-2 bg-white dark:bg-slate-900 ${color} p-3 transition-all shadow-sm hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-2">
                      {icon}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge}`}>débito</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">{fmt(value)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{count} transação{count !== 1 ? "ões" : ""}</p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Ver detalhes →</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── 3. Projeções futuras ───────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Projeções futuras</span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">próximos {walletHorizon} dias</span>
                </div>
                {/* Horizon selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                  {[7, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => { setWalletHorizon(d); }}
                      className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                        walletHorizon === d
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Créditos futuros */}
                <button onClick={() => openProjectionsSheet("credits")}
                  className="group text-left rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                      <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Créditos futuros</p>
                      <p className="text-[10px] text-slate-400">próximos {walletHorizon} dias</p>
                    </div>
                    <span className="ml-auto text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">previsão</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(walletProjections?.futureCredits ?? 0)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{walletProjections?.pendingInvoices?.length ?? 0} fatura{(walletProjections?.pendingInvoices?.length ?? 0) !== 1 ? "s" : ""} pendente{(walletProjections?.pendingInvoices?.length ?? 0) !== 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Ver faturas previstas →</p>
                </button>

                {/* Débitos futuros */}
                <button onClick={() => openProjectionsSheet("debits")}
                  className="group text-left rounded-xl border-2 border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-900 p-4 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/40">
                      <ArrowDownCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Débitos futuros</p>
                      <p className="text-[10px] text-slate-400">próximos {walletHorizon} dias</p>
                    </div>
                    <span className="ml-auto text-[9px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">previsão</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 tabular-nums">{fmt(walletProjections?.futureDebits ?? 0)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{walletProjections?.recurringProjects?.length ?? 0} projeto{(walletProjections?.recurringProjects?.length ?? 0) !== 1 ? "s" : ""} recorrente{(walletProjections?.recurringProjects?.length ?? 0) !== 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Ver projetos previstos →</p>
                </button>
              </div>
            </div>

            {/* Saldo por tipo */}
            {walletStats?.byType?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {walletStats.byType.map((bt) => (
                  <button key={bt.owner_type}
                    onClick={() => { setWalletTypeFilter(walletTypeFilter === bt.owner_type ? "all" : bt.owner_type); setWalletPage(1); }}
                    className={cn("flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs transition-colors",
                      walletTypeFilter === bt.owner_type
                        ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900"
                        : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 ${WALLET_OWNER_COLORS[bt.owner_type] || ""}`)}>
                    <span className="font-semibold">{bt.count} {WALLET_OWNER_LABELS[bt.owner_type] || bt.owner_type}</span>
                    <span className="opacity-60">· {fmt(bt.balance)}</span>
                  </button>
                ))}
                {walletTypeFilter !== "all" && (
                  <button onClick={() => setWalletTypeFilter("all")}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <X className="h-3 w-3" /> Limpar
                  </button>
                )}
              </div>
            )}

            {/* Wallet table */}
            <Card className="overflow-hidden">
              <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
                <table className="w-full text-sm min-w-[600px]">
                  <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Titular" field="owner_name" type="text" sortKey={waSK ? String(waSK) : null} sortDir={waSD} onSort={handleWaSort} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Saldo" field="balance" type="number" sortKey={waSK ? String(waSK) : null} sortDir={waSD} onSort={handleWaSort} />
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bloqueado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Atualizada" field="updated_at" type="date" sortKey={waSK ? String(waSK) : null} sortDir={waSD} onSort={handleWaSort} />
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ position: "sticky", right: 0, top: 0, zIndex: 3, minWidth: 150, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {walletLoading ? (
                      <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Carregando carteiras…</td></tr>
                    ) : wallets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Wallet className="h-8 w-8 opacity-30" />
                            <p>Nenhuma carteira encontrada</p>
                            <p className="text-[11px]">Carteiras são criadas automaticamente ao cadastrar contas</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortWalletsFn(wallets).map((w, idx) => (
                        <tr key={w.id} className={idx % 2 === 0
                          ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                          : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{w.owner_name}</p>
                            {w.owner_email && <p className="text-[11px] text-slate-400 mt-0.5">{w.owner_email}</p>}
                            {w.owner_cnpj  && <p className="text-[10px] text-slate-400">{w.owner_cnpj}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <NeonBadge color={WALLET_OWNER_COLOR_TOKEN[w.owner_type] || "slate"}>
                              {WALLET_OWNER_LABELS[w.owner_type] || w.owner_type}
                            </NeonBadge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className={`font-bold tabular-nums text-sm ${w.balance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                              {fmt(w.balance)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {w.blocked_balance > 0 ? (
                              <p className="text-amber-600 font-semibold text-xs tabular-nums">{fmt(w.blocked_balance)}</p>
                            ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <NeonBadge color={WALLET_STATUS_COLOR[w.status] || "slate"}>
                              {WALLET_STATUS_LABELS[w.status] || w.status}
                            </NeonBadge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">{fmtDate(w.updated_at)}</td>
                          <td
                            className={idx % 2 === 0
                              ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                              : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                            style={{ position: "sticky", right: 0, zIndex: 1, minWidth: 150, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openExtrato(w)} title="Ver extrato"
                                className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" /> Extrato
                              </button>
                              <button onClick={() => { setAdjustWallet(w); setAdjustForm({ direction: "credit", amount: "", description: "", notes: "" }); setAdjustOpen(true); }} title="Lançar ajuste"
                                className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-slate-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                <DollarSign className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 shrink-0">{walletTotal} carteira{walletTotal !== 1 ? "s" : ""}</p>
                {hasHorizontalOverflow && (
                  <div ref={bottomScrollRef} onScroll={handleBottomBarScroll} title="Arraste para rolar a tabela na horizontal" className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center">
                    <div style={{ minWidth: 900, height: 1 }} />
                  </div>
                )}
                <MiniPagination curPage={walletPage} totalPages={walletTotalPages} onChange={setWalletPage} />
              </div>
            </Card>
          </>
        )}

        {/* ── aba Squad ──────────────────────────────────────────────────────── */}
        {activeTab === "squad" && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Clientes ativos", value: squadStats?.activeSquad ?? 0, fmt: (v) => v, color: "border-blue-300", icon: <Users className="h-4 w-4 text-blue-500" /> },
                { label: "Limite total", value: squadStats?.totalCreditLimit ?? 0, fmt, color: "border-purple-300", icon: <CreditCard className="h-4 w-4 text-purple-500" /> },
                { label: "Crédito utilizado", value: squadStats?.totalCreditUsed ?? 0, fmt, color: "border-amber-300", icon: <TrendingDown className="h-4 w-4 text-amber-500" /> },
                { label: "Disponível", value: squadStats?.totalCreditAvailable ?? 0, fmt, color: "border-emerald-300", icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
              ].map(({ label, value, fmt: fmtFn, color, icon }) => (
                <div key={label} className={`rounded-xl border-2 ${color} bg-white dark:bg-slate-900 p-4 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">{icon}</div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight mb-1">{label}</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">{fmtFn(value)}</p>
                </div>
              ))}
            </div>

            {/* Second row stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Mínimo mensal total", value: squadStats?.totalMonthlyMinimum ?? 0, fmt, color: "border-slate-200", icon: <Repeat2 className="h-4 w-4 text-slate-400" /> },
                { label: "Faturas abertas", value: squadStats?.openInvoices ?? 0, fmt: (v) => v, color: "border-amber-200", icon: <ReceiptText className="h-4 w-4 text-amber-500" /> },
                { label: "Faturas vencidas", value: squadStats?.overdueInvoices ?? 0, fmt: (v) => v, color: "border-red-200", icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
                { label: "Ciclos abertos", value: squadStats?.openCycles ?? 0, fmt: (v) => v, color: "border-blue-200", icon: <BarChart3 className="h-4 w-4 text-blue-500" /> },
              ].map(({ label, value, fmt: fmtFn, color, icon }) => (
                <div key={label} className={`rounded-xl border ${color} bg-white dark:bg-slate-900 p-3 shadow-sm`}>
                  <div className="flex items-center justify-between mb-1">{icon}</div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight mb-1">{label}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{fmtFn(value)}</p>
                </div>
              ))}
            </div>

            {/* Header row: title + add button */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Empresas no plano Squad</h3>
              <Button size="sm" onClick={() => { setSquadForm({ company_id: "", credit_limit: "", monthly_minimum: "", billing_day: "1", payment_terms: "30", notes: "" }); setSquadAddOpen(true); }} className="h-8 gap-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                <Plus className="h-3.5 w-3.5" /> Adicionar empresa
              </Button>
            </div>

            {/* Squad table */}
            <Card className="overflow-hidden">
              <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
                <table className="w-full text-sm min-w-[600px]">
                  <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Limite" field="credit_limit" type="number" sortKey={sqSK ? String(sqSK) : null} sortDir={sqSD} onSort={handleSqSort} />
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Mínimo/mês" field="monthly_minimum" type="number" sortKey={sqSK ? String(sqSK) : null} sortDir={sqSD} onSort={handleSqSort} />
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo carteira</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponível</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fechamento</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prazo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th
                        className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ position: "sticky", right: 0, top: 0, zIndex: 3, minWidth: 130, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {squadLoading ? (
                      <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">Carregando Squad…</td></tr>
                    ) : squadList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-sm text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 opacity-30" />
                            <p>Nenhuma empresa no plano Squad</p>
                            <p className="text-[11px]">Clique em "Adicionar empresa" para incluir a primeira</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortSquad(
                        squadList.filter(s => !squadSearch.trim() || s.company?.name?.toLowerCase().includes(squadSearch.toLowerCase())),
                      )
                        .slice(0, squadPerPage)
                        .map((sq, idx) => {
                          const walletBalance = sq.wallet?.balance ?? 0;
                          const available = (sq.credit_limit ?? 0) + walletBalance;
                          const statusMap = { active: { label: "Ativo", color: "emerald" }, suspended: { label: "Suspenso", color: "amber" }, cancelled: { label: "Cancelado", color: "slate" } };
                          const st = statusMap[sq.status] || { label: sq.status, color: "slate" };
                          return (
                            <tr key={sq.id} className={idx % 2 === 0 ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]" : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{sq.company?.name ?? "—"}</p>
                                {sq.company?.cnpj && <p className="text-[10px] text-slate-400">{sq.company.cnpj}</p>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-bold tabular-nums text-xs text-purple-600 dark:text-purple-400">{fmt(sq.credit_limit)}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold tabular-nums text-xs text-slate-600 dark:text-slate-300">{fmt(sq.monthly_minimum)}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold tabular-nums text-xs ${walletBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{fmt(walletBalance)}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold tabular-nums text-xs ${available > 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>{fmt(available)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs text-slate-500">Dia {sq.billing_day}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs text-slate-500">{sq.payment_terms}d</span>
                              </td>
                              <td className="px-4 py-3">
                                <NeonBadge color={st.color}>{st.label}</NeonBadge>
                              </td>
                              <td
                                className={idx % 2 === 0
                                  ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                                  : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                                style={{ position: "sticky", right: 0, zIndex: 1, minWidth: 130, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={async () => {
                                      setSquadDetailTarget(sq);
                                      setSquadCycleLoading(true);
                                      try { const cycle = await apiClient.getSquadCurrentCycle(sq.id); setSquadCurrentCycle(cycle); }
                                      catch { setSquadCurrentCycle(null); }
                                      finally { setSquadCycleLoading(false); }
                                    }}
                                    className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" /> Ciclo
                                  </button>
                                  <button
                                    onClick={() => { setSquadEditTarget(sq); setSquadForm({ company_id: sq.company_id, credit_limit: String(sq.credit_limit), monthly_minimum: String(sq.monthly_minimum), billing_day: String(sq.billing_day), payment_terms: String(sq.payment_terms), notes: sq.notes ?? "" }); setSquadAddOpen(true); }}
                                    className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-slate-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                    title="Editar Squad"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ── aba Conciliação Bancária ──────────────────────────────────────── */}
        {activeTab === "conciliacao" && (
          <>
            {/* Aviso explicativo */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Este relatório considera apenas movimentações com entrada ou saída real de dinheiro, para conferência com extratos bancários.
                Bônus, créditos promocionais e movimentações internas de projetos <strong>não entram</strong> na conciliação.
              </p>
            </div>

            {/* Filtros de período + tipo */}
            <div className="flex flex-wrap items-center gap-2">
              <AdvancedDateFilter
                dateRange={concilDateRange}
                onDateRangeChange={(r) => { setConcilDateRange(r); setConcilPage(1); }}
              />
              {concilDateRange && (
                <button onClick={() => { setConcilDateRange(undefined); setConcilPage(1); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <X className="h-3 w-3" /> Limpar período
                </button>
              )}
              {/* Impacto: entrada / saída */}
              <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                {[
                  { v: "all",      l: "Todas" },
                  { v: "bank_in",  l: "Entradas" },
                  { v: "bank_out", l: "Saídas" },
                ].map(({ v, l }) => (
                  <button key={v} onClick={() => { setConcilImpact(v); setConcilPage(1); }}
                    className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                      concilImpact === v
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Origem */}
              <Select value={concilOrigin} onValueChange={(v) => { setConcilOrigin(v); setConcilPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="payment">Pagamento (cartão/PIX/boleto)</SelectItem>
                  <SelectItem value="pix">PIX direto</SelectItem>
                  <SelectItem value="boleto">Boleto compensado</SelectItem>
                  <SelectItem value="plan">Plano</SelectItem>
                  <SelectItem value="invoice">Fatura paga</SelectItem>
                  <SelectItem value="additional_credit">Crédito adicional</SelectItem>
                  <SelectItem value="recharge">Recarga</SelectItem>
                  <SelectItem value="withdrawal">Saque</SelectItem>
                  <SelectItem value="refund">Reembolso/Estorno</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
              {/* Perfil */}
              <Select value={concilOwnerType} onValueChange={(v) => { setConcilOwnerType(v); setConcilPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as carteiras</SelectItem>
                  <SelectItem value="company">Empresas</SelectItem>
                  <SelectItem value="agency">Agências</SelectItem>
                  <SelectItem value="nomad">Nômades</SelectItem>
                  <SelectItem value="partner">Parceiros</SelectItem>
                  <SelectItem value="platform">Plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Entradas reais",     value: concilStats?.bankIn       ?? 0, fmt, color: "border-emerald-400 dark:border-emerald-600", badge: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400", icon: <ArrowUpCircle className="h-4 w-4 text-emerald-500" />, sub: `${concilStats?.bankInCount ?? 0} transações` },
                { label: "Saídas reais",       value: concilStats?.bankOut      ?? 0, fmt, color: "border-red-400 dark:border-red-600",     badge: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",     icon: <ArrowDownCircle className="h-4 w-4 text-red-500" />,     sub: `${concilStats?.bankOutCount ?? 0} transações` },
                { label: "Saldo líquido real", value: concilStats?.netReal      ?? 0, fmt, color: `${(concilStats?.netReal ?? 0) >= 0 ? "border-blue-400" : "border-orange-400"}`, badge: `${(concilStats?.netReal ?? 0) >= 0 ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" : "bg-orange-100 text-orange-700"}`, icon: <TrendingUp className="h-4 w-4 text-blue-500" />, sub: "Entradas − Saídas" },
                { label: "Total de transações",value: (concilStats?.bankInCount ?? 0) + (concilStats?.bankOutCount ?? 0), fmt: (v) => v, color: "border-slate-300 dark:border-slate-600", badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400", icon: <FileText className="h-4 w-4 text-slate-500" />, sub: "conciliáveis no período" },
              ].map(({ label, value, fmt: fmtFn, color, badge, icon, sub }) => (
                <div key={label} className={`rounded-xl border-2 ${color} bg-white dark:bg-slate-900 p-4 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    {icon}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge}`}>real</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight mb-1">{label}</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">{fmtFn(value)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Saques pagos",          value: concilStats?.withdrawals         ?? 0, fmt,        sub: `${concilStats?.withdrawalCount ?? 0} saques`, color: "border-rose-200",   icon: <ArrowDownRight className="h-4 w-4 text-rose-500" /> },
                { label: "Créditos reais",         value: concilStats?.realCredits         ?? 0, fmt,        sub: `${concilStats?.realCreditCount ?? 0} entradas`, color: "border-emerald-200", icon: <ArrowUpRight className="h-4 w-4 text-emerald-500" /> },
                { label: "Carteiras com movimento",value: concilStats?.walletsWithMovement ?? 0, fmt: v => v, sub: "no período filtrado",   color: "border-blue-200",   icon: <Wallet className="h-4 w-4 text-blue-500" /> },
                { label: "Período",                value: concilDateRange?.from ? `${fmtDate(concilDateRange.from)} → ${fmtDate(concilDateRange.to)}` : "Sem filtro", fmt: v => v, sub: "intervalo selecionado", color: "border-slate-200", icon: <CalendarClock className="h-4 w-4 text-slate-400" /> },
              ].map(({ label, value, fmt: fmtFn, sub, color, icon }) => (
                <div key={label} className={`rounded-xl border ${color} bg-white dark:bg-slate-900 p-3 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-1">{icon}</div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight mb-1">{label}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{fmtFn(value)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Tabela de conciliação */}
            <Card className="overflow-hidden">
              <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
                <table className="w-full text-sm min-w-[600px]">
                  <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        <SortableHeader label="Data/Hora" field="created_at" type="date" sortKey={ccSK ? String(ccSK) : null} sortDir={ccSD} onSort={handleCcSort} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Titular</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Origem</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <SortableHeader label="Valor" field="amount" type="number" sortKey={ccSK ? String(ccSK) : null} sortDir={ccSD} onSort={handleCcSort} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Referência</th>
                      <th
                        className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ position: "sticky", right: 0, top: 0, zIndex: 3, minWidth: 108, background: "var(--table-head)", boxShadow: "-1px 0 0 rgba(100,116,139,0.18), 0 1px 0 rgba(148,163,184,0.3)" }}
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {concilLoading ? (
                      <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">Carregando conciliação…</td></tr>
                    ) : concilData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-sm text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <Landmark className="h-8 w-8 opacity-30" />
                            <p>Nenhuma movimentação bancária real encontrada</p>
                            <p className="text-[11px]">Ajuste o período ou os filtros para ver as transações</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortConcil(concilData).map((entry, idx) => {
                        const isBankIn = entry.bank_impact === "bank_in";
                        const ownerLabels = { company: "Empresa", agency: "Agência", nomad: "Nômade", partner: "Parceiro", platform: "Plataforma" };
                        const ownerColors = { company: "blue", agency: "violet", nomad: "emerald", partner: "amber", platform: "slate" };
                        const originLabels = { payment: "Pagamento", pix: "PIX", boleto: "Boleto", card: "Cartão", plan: "Plano", recharge: "Recarga", additional_credit: "Créd. Adicional", invoice_payment: "Fatura", invoice: "Fatura", squad_payment: "Squad", withdrawal: "Saque", transfer: "Transferência", refund: "Reembolso", chargeback: "Estorno", bank_fee: "Taxa Bancária", external_payment: "Pag. Externo" };
                        return (
                          <tr key={entry.id} className={idx % 2 === 0 ? "group bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]" : "group bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"}>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(entry.created_at)}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs leading-tight">{entry.wallet?.owner_name ?? "—"}</p>
                              {entry.wallet?.owner_email && <p className="text-[10px] text-slate-400">{entry.wallet.owner_email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <NeonBadge color={ownerColors[entry.wallet?.owner_type] || "slate"}>
                                {ownerLabels[entry.wallet?.owner_type] || entry.wallet?.owner_type || "—"}
                              </NeonBadge>
                            </td>
                            <td className="px-4 py-3">
                              <NeonBadge color={isBankIn ? "emerald" : "red"} className="inline-flex items-center gap-1">
                                {isBankIn ? <ArrowUpCircle className="h-2.5 w-2.5" /> : <ArrowDownCircle className="h-2.5 w-2.5" />}
                                {isBankIn ? "Entrada real" : "Saída real"}
                              </NeonBadge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{originLabels[entry.type] || entry.type}</span>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={entry.description}>{entry.description}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold tabular-nums text-sm ${isBankIn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {isBankIn ? "+" : "−"}{fmt(entry.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {entry.reference_type ? (
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{entry.reference_type}</p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]" title={entry.reference_id}>{entry.reference_id || "—"}</p>
                                </div>
                              ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                            </td>
                            <td
                              className={idx % 2 === 0
                                ? "px-4 py-3 bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                                : "px-4 py-3 bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"}
                              style={{ position: "sticky", right: 0, zIndex: 1, minWidth: 108, boxShadow: "-1px 0 0 rgba(100,116,139,0.18)" }}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openExtrato(entry.wallet)}
                                  className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                  title="Abrir carteira"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Carteira
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Paginação */}
              {concilTotal > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400 shrink-0">{concilTotal} transaç{concilTotal !== 1 ? "ões" : "ão"} conciliável{concilTotal !== 1 ? "is" : ""}</p>
                  {hasHorizontalOverflow && (
                    <div ref={bottomScrollRef} onScroll={handleBottomBarScroll} title="Arraste para rolar a tabela na horizontal" className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center">
                      <div style={{ minWidth: 900, height: 1 }} />
                    </div>
                  )}
                  <MiniPagination curPage={concilPage} totalPages={Math.max(1, Math.ceil(concilTotal / concilPerPage))} onChange={setConcilPage} />
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* ── Modal Squad: Adicionar / Editar ────────────────────────────────── */}
      {squadAddOpen && (
        <div
          data-slot="sheet-content"
          data-state="open"
          className="fixed right-0 z-70 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 duration-300"
          style={{
            left: sidebarWidth - 2,
            top: headerHeight - 1,
            bottom: footerHeight - 1,
            width: `calc(100vw - ${sidebarWidth - 2}px)`,
          }}
        >
          <div className="bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{
                background:
                  "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))",
              }}
            >
              <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
                {squadEditTarget ? "Editar Squad" : "Adicionar ao Squad"}
                <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">Plano pós-pago com limite de crédito</p>
              </div>
              <button onClick={() => { setSquadAddOpen(false); setSquadEditTarget(null); }} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {!squadEditTarget && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Empresa *</Label>
                  <Select value={squadForm.company_id} onValueChange={(v) => setSquadForm(f => ({ ...f, company_id: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.filter(c => !squadList.some(s => s.company_id === c.id)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Limite de crédito (R$) *</Label>
                  <Input type="number" min="0" step="100" placeholder="Ex: 10000" value={squadForm.credit_limit} onChange={(e) => setSquadForm(f => ({ ...f, credit_limit: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Mínimo mensal (R$)</Label>
                  <Input type="number" min="0" step="100" placeholder="Ex: 2000" value={squadForm.monthly_minimum} onChange={(e) => setSquadForm(f => ({ ...f, monthly_minimum: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Dia de fechamento</Label>
                  <Input type="number" min="1" max="28" placeholder="1–28" value={squadForm.billing_day} onChange={(e) => setSquadForm(f => ({ ...f, billing_day: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Prazo de pagamento (dias)</Label>
                  <Input type="number" min="1" max="90" placeholder="Ex: 30" value={squadForm.payment_terms} onChange={(e) => setSquadForm(f => ({ ...f, payment_terms: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Observações</Label>
                <Input placeholder="Anotações internas..." value={squadForm.notes} onChange={(e) => setSquadForm(f => ({ ...f, notes: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSquadAddOpen(false); setSquadEditTarget(null); }}>Cancelar</Button>
              <Button size="sm" disabled={squadFormLoading} onClick={async () => {
                if (!squadForm.credit_limit) { toast({ title: "Informe o limite de crédito", variant: "destructive" }); return; }
                if (!squadEditTarget && !squadForm.company_id) { toast({ title: "Selecione uma empresa", variant: "destructive" }); return; }
                setSquadFormLoading(true);
                try {
                  const payload = {
                    credit_limit: parseFloat(squadForm.credit_limit),
                    monthly_minimum: parseFloat(squadForm.monthly_minimum || "0"),
                    billing_day: parseInt(squadForm.billing_day || "1"),
                    payment_terms: parseInt(squadForm.payment_terms || "30"),
                    notes: squadForm.notes || undefined,
                  };
                  if (squadEditTarget) { await apiClient.updateSquad(squadEditTarget.id, payload); toast({ title: "Squad atualizado" }); }
                  else { await apiClient.createSquad({ ...payload, company_id: squadForm.company_id }); toast({ title: "Empresa adicionada ao Squad" }); }
                  setSquadAddOpen(false); setSquadEditTarget(null); loadSquad();
                } catch (err) {
                  toast({ title: "Erro ao salvar Squad", description: err?.message, variant: "destructive" });
                } finally { setSquadFormLoading(false); }
              }} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {squadFormLoading ? "Salvando…" : squadEditTarget ? "Salvar alterações" : "Adicionar ao Squad"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer: Ciclo atual Squad ─────────────────────────────────────── */}
      <Sheet open={!!squadDetailTarget} onOpenChange={(o) => { if (!o) { setSquadDetailTarget(null); setSquadCurrentCycle(null); } }}>
        <SheetContent className="w-full max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{squadDetailTarget?.company?.name} — Ciclo atual</SheetTitle>
          </SheetHeader>
          {squadCycleLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Carregando ciclo…</div>
          ) : !squadCurrentCycle ? (
            <div className="py-12 text-center text-sm text-slate-400">Nenhum ciclo aberto</div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Início", value: fmtDate(squadCurrentCycle.cycle?.start_date) },
                  { label: "Fechamento previsto", value: fmtDate(squadCurrentCycle.cycle?.end_date) },
                  { label: "Mínimo mensal", value: fmt(squadDetailTarget?.monthly_minimum) },
                  { label: "Consumo no ciclo", value: fmt(squadCurrentCycle.totalConsumed) },
                  { label: "Limite de crédito", value: fmt(squadDetailTarget?.credit_limit) },
                  { label: "Saldo carteira", value: fmt(squadCurrentCycle.walletBalance) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {/* Ledger entries */}
              {(squadCurrentCycle.entries || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Lançamentos do ciclo</p>
                  <div className="space-y-1">
                    {squadCurrentCycle.entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{e.description}</p>
                          <p className="text-slate-400">{fmtDateTime(e.created_at)}</p>
                        </div>
                        <span className={`font-bold tabular-nums ${e.direction === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                          {e.direction === "credit" ? "+" : "−"}{fmt(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Close cycle action */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={async () => {
                    try {
                      await apiClient.closeSquadCycle(squadDetailTarget.id);
                      toast({ title: "Ciclo fechado e fatura gerada" });
                      setSquadDetailTarget(null); setSquadCurrentCycle(null);
                      loadSquad();
                    } catch (err) {
                      toast({ title: "Erro ao fechar ciclo", description: err?.message, variant: "destructive" });
                    }
                  }}
                >
                  Fechar ciclo e gerar fatura
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modal Filtros Avançados — mesmo estilo de Projetos ─────── */}
      {filterOpen && (
        <div
          data-slot="sheet-content"
          data-state="open"
          className="fixed right-0 z-70 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 duration-300"
          style={{
            left: sidebarWidth - 2,
            top: headerHeight - 1,
            bottom: footerHeight - 1,
            width: `calc(100vw - ${sidebarWidth - 2}px)`,
          }}
        >
          <div className="bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden">

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{
                background:
                  "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))",
              }}
            >
              <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
                Filtros Avançados
                <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">Configure os filtros para refinar os resultados</p>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Left: saved filters */}
              <div className="w-44 shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-800/50">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Filtros Salvos</p>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {savedFilters.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4 px-2">Nenhum filtro salvo</p>
                  ) : (
                    savedFilters.map((sf) => (
                      <div
                        key={sf.id}
                        onClick={() => {
                          setActiveFilterId(sf.id);
                          setDraftInvStatus(sf.status);
                          setDraftWdStatus(sf.wdStatus);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-2 mx-1 rounded-lg mb-0.5 cursor-pointer text-xs transition-colors",
                          activeFilterId === sf.id
                            ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <GripVertical className="h-3 w-3 text-slate-300 shrink-0" />
                        <span className="flex-1 truncate">{sf.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSavedFilters(p => p.filter(s => s.id !== sf.id)); if (activeFilterId === sf.id) setActiveFilterId(null); }}
                          className="h-4 w-4 flex items-center justify-center rounded hover:bg-red-100 text-slate-300 hover:text-red-500 shrink-0"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                  {isSavingFilter ? (
                    <div className="space-y-1.5">
                      <Input
                        value={savedFilterName}
                        onChange={(e) => setSavedFilterName(e.target.value)}
                        placeholder="Nome do filtro"
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && savedFilterName.trim()) {
                            setSavedFilters(p => [...p, { id: Date.now().toString(), name: savedFilterName, status: draftInvStatus, wdStatus: draftWdStatus }]);
                            setSavedFilterName(""); setIsSavingFilter(false);
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="flex-1 h-6 text-[10px] btn-brand"
                          onClick={() => { if (!savedFilterName.trim()) return; setSavedFilters(p => [...p, { id: Date.now().toString(), name: savedFilterName, status: draftInvStatus, wdStatus: draftWdStatus }]); setSavedFilterName(""); setIsSavingFilter(false); }}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setIsSavingFilter(false)}>
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full h-7 text-[10px] text-slate-500" onClick={() => setIsSavingFilter(true)}>
                      + Salvar filtro atual
                    </Button>
                  )}
                </div>
              </div>

              {/* Right: filter fields */}
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Section tabs */}
                <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  {[{ id: "faturas", label: "Faturas" }, { id: "saques", label: "Saques" }, { id: "despesas", label: "Despesas" }, { id: "carteiras", label: "Carteiras" }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFilterActiveTab(t.id as any)}
                      className={cn(
                        "text-[12px] font-medium transition-colors pb-1.5 border-b-2",
                        filterActiveTab === t.id
                          ? "text-blue-600 border-blue-500"
                          : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Scrollable fields */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {filterActiveTab === "faturas" && (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Status da Fatura</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "all",       label: "Todos" },
                            { value: "pending",   label: "Pendente" },
                            { value: "paid",      label: "Pago" },
                            { value: "overdue",   label: "Em Atraso" },
                            { value: "cancelled", label: "Cancelado" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setDraftInvStatus(opt.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftInvStatus === opt.value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Período</p>
                        <AdvancedDateFilter
                          dateRange={dateRange}
                          onDateChange={(range) => { setDateRange(range); setInvPage(1); }}
                          onReset={() => { setDateRange(undefined); setInvPage(1); }}
                          isLoading={false}
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-900 dark:text-white">{invoiceTotal}</span> fatura{invoiceTotal !== 1 ? "s" : ""} no total
                        </p>
                      </div>
                    </>
                  )}

                  {filterActiveTab === "saques" && (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Status do Saque</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "all",                label: "Todos" },
                            { value: "aguardando_analise", label: "Aguardando" },
                            { value: "pagamento_agendado", label: "Agendado" },
                            { value: "pagamento_efetuado", label: "Pago" },
                            { value: "reprovado",          label: "Reprovado" },
                            { value: "cancelado",          label: "Cancelado" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setDraftWdStatus(opt.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftWdStatus === opt.value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-900 dark:text-white">{filteredWithdrawals.length}</span> saque{filteredWithdrawals.length !== 1 ? "s" : ""}
                          {wdStatusFilter !== "all" ? " filtrados" : " no total"}
                        </p>
                      </div>
                    </>
                  )}

                  {filterActiveTab === "despesas" && (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "all",       label: "Todos" },
                            { value: "prevista",  label: "Prevista" },
                            { value: "pendente",  label: "Pendente" },
                            { value: "paga",      label: "Paga" },
                            { value: "atrasada",  label: "Atrasada" },
                            { value: "cancelada", label: "Cancelada" },
                          ].map(opt => (
                            <button key={opt.value} onClick={() => setDraftExpStatus(opt.value)}
                              className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftExpStatus === opt.value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600")}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipo</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "all",      label: "Todos" },
                            { value: "fixa",     label: "Fixa" },
                            { value: "variável", label: "Variável" },
                          ].map(opt => (
                            <button key={opt.value} onClick={() => setDraftExpType(opt.value)}
                              className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftExpType === opt.value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600")}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Categoria</p>
                        <div className="flex flex-wrap gap-2">
                          {["all", ...EXP_CATEGORIES].map(cat => (
                            <button key={cat} onClick={() => setDraftExpCategory(cat)}
                              className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftExpCategory === cat
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600")}>
                              {cat === "all" ? "Todas" : cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-900 dark:text-white">{expenseTotal}</span> despesa{expenseTotal !== 1 ? "s" : ""} no total
                        </p>
                      </div>
                    </>
                  )}

                  {filterActiveTab === "carteiras" && (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Perfil da Carteira</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "all",      label: "Todos" },
                            { value: "company",  label: "Empresa" },
                            { value: "agency",   label: "Agência" },
                            { value: "nomad",    label: "Nômade" },
                            { value: "partner",  label: "Partner" },
                            { value: "platform", label: "Plataforma" },
                          ].map(opt => (
                            <button key={opt.value} onClick={() => setDraftWalletType(opt.value)}
                              className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftWalletType === opt.value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600")}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Status da Carteira</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "all",       label: "Todas" },
                            { value: "active",    label: "Ativa" },
                            { value: "suspended", label: "Suspensa" },
                            { value: "closed",    label: "Encerrada" },
                          ].map(opt => (
                            <button key={opt.value} onClick={() => setDraftWalletStatus(opt.value)}
                              className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                draftWalletStatus === opt.value
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600")}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-900 dark:text-white">{walletTotal}</span> carteira{walletTotal !== 1 ? "s" : ""} no total
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <button onClick={clearAllFilters} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline transition-colors">
                Limpar filtros
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setFilterOpen(false)}>Cancelar</Button>
                <Button size="sm" className="h-8 text-xs btn-brand" onClick={applyFilters}>Aplicar Filtros</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Configurar colunas — Faturas ────────────────────────────── */}
      <SlidePanel
        open={columnsPanelOpen}
        onClose={() => setColumnsPanelOpen(false)}
        title="Configurar colunas"
        subtitle={`${invVisibleCols.size} de ${INVOICE_COLUMNS.length} visíveis`}
        widthMode="full"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setInvVisibleCols(new Set(DEFAULT_INVOICE_VISIBLE_COLS))}
              className="h-9 px-4 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Restaurar padrão
            </button>
            <button
              onClick={() => setInvVisibleCols(new Set(INVOICE_COLUMNS.map((c) => c.key)))}
              className="h-9 px-4 rounded-lg text-xs font-semibold btn-brand transition-all"
            >
              Mostrar todas
            </button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INVOICE_COLUMNS.map((col) => (
              <label
                key={col.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors",
                  invVisibleCols.has(col.key)
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
                  col.required && "opacity-60 pointer-events-none",
                )}
              >
                <Checkbox
                  checked={invVisibleCols.has(col.key)}
                  onCheckedChange={() => {
                    setInvVisibleCols((prev) => {
                      const next = new Set(prev);
                      next.has(col.key) ? next.delete(col.key) : next.add(col.key);
                      return next;
                    });
                  }}
                  disabled={col.required}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                  {col.label}
                </span>
                {col.required && (
                  <span className="text-[9px] text-slate-400 flex-shrink-0">obrigatória</span>
                )}
              </label>
            ))}
          </div>
        </div>
      </SlidePanel>

      {/* ── Sheet Nova / Editar Fatura ─────────────────────────────── */}
      <SlidePanel
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingInvoice ? "Editar Fatura" : "Nova Fatura"}
        widthMode="full"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button disabled={actionLoading === "save"} onClick={handleSaveInvoice}>
              {actionLoading === "save" ? "Salvando…" : editingInvoice ? "Salvar" : "Criar Fatura"}
            </Button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nº da Fatura</Label>
              <Input placeholder="Ex: FAT-2026-001" className="h-9 text-sm" value={form.invoice_number}
                onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="0.00" className="h-9 text-sm" value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa</Label>
              <Select value={form.company_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, company_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de Vencimento</Label>
              <Input type="date" className="h-9 text-sm" value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input placeholder="Descrição da fatura…" className="h-9 text-sm" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
        </div>
        </div>
      </SlidePanel>

      {/* ── Confirmar exclusão fatura ──────────────────────────────── */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Fatura"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteInvoice}
      />

      {/* ── Sheet Nova / Editar Despesa ────────────────────────────── */}
      <SlidePanel
        open={expSheetOpen}
        onClose={() => setExpSheetOpen(false)}
        title={editingExpense ? "Editar Despesa" : "Nova Despesa"}
        widthMode="full"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExpSheetOpen(false)}>Cancelar</Button>
            <Button className="btn-brand border-0" disabled={actionLoading === "exp-save"} onClick={handleSaveExpense}>
              {actionLoading === "exp-save" ? "Salvando…" : editingExpense ? "Salvar" : "Criar Despesa"}
            </Button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Plano Vercel Pro" className="h-9 text-sm" value={expForm.name}
                onChange={(e) => setExpForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="0.00" className="h-9 text-sm" value={expForm.amount}
                onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={expForm.category} onValueChange={(v) => setExpForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={expForm.status} onValueChange={(v) => setExpForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prevista">Prevista</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={expForm.type} onValueChange={(v) => setExpForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variável">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recorrência</Label>
                <Select value={expForm.recurrence} onValueChange={(v) => setExpForm((f) => ({ ...f, recurrence: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="única">Única</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(expForm.recurrence === "mensal" || expForm.recurrence === "anual") && !editingExpense && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/40">
                <input type="checkbox" id="recurring-base" className="h-4 w-4 rounded border-slate-300"
                  checked={expForm.is_recurring_base}
                  onChange={(e) => setExpForm((f) => ({ ...f, is_recurring_base: e.target.checked }))} />
                <label htmlFor="recurring-base" className="text-xs text-blue-800 dark:text-blue-300 cursor-pointer">
                  Gerar automaticamente as próximas 11 ocorrências
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Vencimento</Label>
                <Input type="date" className="h-9 text-sm" value={expForm.due_date}
                  onChange={(e) => setExpForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mês de Competência</Label>
                <Input type="month" className="h-9 text-sm" value={expForm.competence_month}
                  onChange={(e) => setExpForm((f) => ({ ...f, competence_month: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Input placeholder="Ex: PIX, Boleto…" className="h-9 text-sm" value={expForm.payment_method}
                  onChange={(e) => setExpForm((f) => ({ ...f, payment_method: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Input placeholder="Ex: Marketing" className="h-9 text-sm" value={expForm.department}
                  onChange={(e) => setExpForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input placeholder="Descrição opcional…" className="h-9 text-sm" value={expForm.description}
                onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Input placeholder="Observações internas…" className="h-9 text-sm" value={expForm.notes}
                onChange={(e) => setExpForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
        </div>
        </div>
      </SlidePanel>

      {/* ── Confirmar exclusão despesa ─────────────────────────────── */}
      <ConfirmationDialog
        open={!!expDeleteTarget}
        onOpenChange={(open) => !open && setExpDeleteTarget(null)}
        title="Excluir Despesa"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteExpense}
      />

      {/* ── Sheet Extrato de Carteira ──────────────────────────────── */}
      <Sheet open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
          {/* Header com gradiente */}
          <div className="app-brand-header px-6 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Extrato da Carteira</p>
                <h2 className="text-white font-bold text-lg leading-tight">{selectedWallet?.owner_name || "—"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 bg-white/10">
                    {WALLET_OWNER_LABELS[selectedWallet?.owner_type] || selectedWallet?.owner_type}
                  </Badge>
                  {selectedWallet?.owner_email && (
                    <span className="text-[10px] text-blue-200">{selectedWallet.owner_email}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-[10px]">Saldo atual</p>
                <p className="text-white font-bold text-2xl tabular-nums">{fmt(selectedWallet?.balance ?? 0)}</p>
                {(selectedWallet?.blocked_balance ?? 0) > 0 && (
                  <p className="text-amber-300 text-[10px] mt-0.5">{fmt(selectedWallet?.blocked_balance)} bloqueado</p>
                )}
              </div>
            </div>

            {/* Resumo do período */}
            {ledgerSummary && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Créditos", value: ledgerSummary.credits, color: "text-emerald-300" },
                  { label: "Débitos",  value: ledgerSummary.debits,  color: "text-red-300" },
                  { label: "Líquido",  value: ledgerSummary.net,     color: ledgerSummary.net >= 0 ? "text-emerald-300" : "text-red-300" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-blue-200">{label}</p>
                    <p className={`text-sm font-bold tabular-nums ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtros do extrato */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap shrink-0 bg-slate-50 dark:bg-slate-800/50">
            {[
              { value: "all",    label: "Todos" },
              { value: "credit", label: "Créditos" },
              { value: "debit",  label: "Débitos" },
            ].map(opt => (
              <button key={opt.value} onClick={() => { setLedgerDirFilter(opt.value); setLedgerPage(1); }}
                className={cn("px-3 py-1 rounded-full border text-[11px] font-medium transition-colors",
                  ledgerDirFilter === opt.value
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600")}>
                {opt.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => loadLedger(selectedWallet?.id)}
                className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Atualizar">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setAdjustWallet(selectedWallet); setAdjustForm({ direction: "credit", amount: "", description: "", notes: "" }); setAdjustOpen(true); }}
                className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium btn-brand border-0">
                <Plus className="h-3 w-3" /> Ajuste
              </button>
            </div>
          </div>

          {/* Lista de movimentações */}
          <div className="flex-1 overflow-y-auto">
            {ledgerLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">Carregando extrato…</div>
            ) : ledger.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                <BarChart3 className="h-8 w-8 opacity-30" />
                <p>Nenhuma movimentação encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {ledger.map((entry: any) => {
                  const isCredit = entry.direction === "credit";
                  return (
                    <div key={entry.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${isCredit ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                          {isCredit
                            ? <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            : <ArrowDownCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{entry.description}</p>
                            <p className={`text-sm font-bold tabular-nums shrink-0 ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                              {isCredit ? "+" : "−"}{fmt(entry.amount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">{fmtDateTime(entry.created_at)}</span>
                            {entry.category && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{entry.category}</span>
                            )}
                            {entry.type && entry.type !== entry.direction && (
                              <span className="text-[10px] text-slate-400">{LEDGER_TYPE_LABELS[entry.type] || entry.type}</span>
                            )}
                            <Badge variant="outline" className={`text-[9px] py-0 px-1 ${entry.status === "confirmed" ? "text-emerald-600 border-emerald-200" : entry.status === "pending" ? "text-amber-600 border-amber-200" : "text-slate-400 border-slate-200"}`}>
                              {entry.status === "confirmed" ? "Confirmado" : entry.status === "pending" ? "Pendente" : entry.status === "reversed" ? "Estornado" : entry.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-400">Antes: <span className="font-medium text-slate-600 dark:text-slate-300">{fmt(entry.balance_before)}</span></span>
                            <span className="text-[10px] text-slate-400">→</span>
                            <span className="text-[10px] text-slate-400">Depois: <span className="font-medium text-slate-600 dark:text-slate-300">{fmt(entry.balance_after)}</span></span>
                          </div>
                          {entry.notes && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer paginação */}
          <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-400">{ledgerTotal} movimentação{ledgerTotal !== 1 ? "ões" : ""}</p>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setLedgerPage(p => Math.max(1, p - 1))} disabled={ledgerPage === 1}
                className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-400 px-1">{ledgerPage} / {ledgerTotalPages}</span>
              <button onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))} disabled={ledgerPage === ledgerTotalPages}
                className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet Ledger Global (drilldown de widgets) ────────────── */}
      <Sheet open={globalLedgerOpen} onOpenChange={setGlobalLedgerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
          <div className="app-brand-header px-6 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Movimentações — Todas as Carteiras</p>
                <h2 className="text-white font-bold text-lg leading-tight">{globalLedgerTitle || "Extrato Global"}</h2>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-[10px]">Total ({globalLedgerSummary?.credits >= 0 ? "crédito" : "débito"})</p>
                {globalLedgerDir === "debit"
                  ? <p className="text-white font-bold text-2xl tabular-nums">{fmt(globalLedgerSummary?.debits ?? 0)}</p>
                  : <p className="text-white font-bold text-2xl tabular-nums">{fmt(globalLedgerSummary?.credits ?? 0)}</p>}
              </div>
            </div>
            {globalLedgerSummary && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Créditos", value: globalLedgerSummary.credits, color: "text-emerald-300" },
                  { label: "Débitos",  value: globalLedgerSummary.debits,  color: "text-red-300" },
                  { label: "Líquido",  value: globalLedgerSummary.net,     color: globalLedgerSummary.net >= 0 ? "text-emerald-300" : "text-red-300" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-blue-200">{label}</p>
                    <p className={`text-sm font-bold tabular-nums ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap shrink-0 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] text-slate-500">{globalLedgerTotal} movimentação{globalLedgerTotal !== 1 ? "ões" : ""}</span>
            <button onClick={() => loadGlobalLedger()}
              className="ml-auto h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Atualizar">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {globalLedgerLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">Carregando movimentações…</div>
            ) : globalLedger.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                <BarChart3 className="h-8 w-8 opacity-30" />
                <p>Nenhuma movimentação encontrada</p>
                <p className="text-[11px]">Tente ajustar os filtros ou o período</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {globalLedger.map((entry: any) => {
                  const isCredit = entry.direction === "credit";
                  const ownerLabel = WALLET_OWNER_LABELS[entry.wallet?.owner_type] || entry.wallet?.owner_type || "—";
                  const ownerColor = WALLET_OWNER_COLORS[entry.wallet?.owner_type] || "";
                  return (
                    <div key={entry.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${isCredit ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                          {isCredit
                            ? <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            : <ArrowDownCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{entry.description}</p>
                            <p className={`text-sm font-bold tabular-nums shrink-0 ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                              {isCredit ? "+" : "−"}{fmt(entry.amount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{fmtDateTime(entry.created_at)}</span>
                            {entry.wallet?.owner_name && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ownerColor}`}>
                                {ownerLabel}: {entry.wallet.owner_name}
                              </span>
                            )}
                            {entry.category && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{entry.category}</span>
                            )}
                            {entry.type && (
                              <span className="text-[10px] text-slate-400">{LEDGER_TYPE_LABELS[entry.type] || entry.type}</span>
                            )}
                            <Badge variant="outline" className={`text-[9px] py-0 px-1 ${entry.status === "confirmed" ? "text-emerald-600 border-emerald-200" : entry.status === "pending" ? "text-amber-600 border-amber-200" : "text-slate-400 border-slate-200"}`}>
                              {entry.status === "confirmed" ? "Confirmado" : entry.status === "pending" ? "Pendente" : entry.status === "reversed" ? "Estornado" : entry.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-400">{globalLedgerTotal} mov.</p>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setGlobalLedgerPage(p => Math.max(1, p - 1))} disabled={globalLedgerPage === 1}
                className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-400 px-1">{globalLedgerPage} / {globalLedgerTotalPages}</span>
              <button onClick={() => setGlobalLedgerPage(p => Math.min(globalLedgerTotalPages, p + 1))} disabled={globalLedgerPage === globalLedgerTotalPages}
                className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet Projeções Futuras ────────────────────────────────── */}
      <Sheet open={projectionsOpen} onOpenChange={setProjectionsOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
          <div className="app-brand-header px-6 py-4 shrink-0">
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Projeções — próximos {walletHorizon} dias</p>
            <h2 className="text-white font-bold text-lg">
              {projectionsMode === "credits" ? "Créditos futuros previstos" : "Débitos futuros previstos"}
            </h2>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${projectionsMode === "credits" ? "text-emerald-300" : "text-orange-300"}`}>
              {fmt(projectionsMode === "credits" ? (walletProjections?.futureCredits ?? 0) : (walletProjections?.futureDebits ?? 0))}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {projectionsMode === "credits" ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(walletProjections?.pendingInvoices || []).length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                    <CalendarClock className="h-8 w-8 opacity-30" />
                    <p>Nenhuma fatura pendente nos próximos {walletHorizon} dias</p>
                  </div>
                ) : (walletProjections?.pendingInvoices || []).map((inv: any) => (
                  <div key={inv.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-1.5 shrink-0 bg-emerald-50 dark:bg-emerald-950/30">
                        <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{inv.description || "Fatura pendente"}</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">+{fmt(inv.amount)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{inv.company_name}</span>
                          {inv.invoice_number && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">{inv.invoice_number}</span>}
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> Vence {fmtDate(inv.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(walletProjections?.recurringProjects || []).length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                    <Repeat2 className="h-8 w-8 opacity-30" />
                    <p>Nenhum projeto recorrente ativo</p>
                  </div>
                ) : (walletProjections?.recurringProjects || []).map((proj: any) => (
                  <div key={proj.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full p-1.5 shrink-0 bg-orange-50 dark:bg-orange-950/30">
                        <Repeat2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{proj.title}</p>
                          <p className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums shrink-0">−{fmt(proj.value)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{proj.client_name}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-emerald-600 border-emerald-200">recorrente</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
            <button onClick={() => setProjectionsMode(projectionsMode === "credits" ? "debits" : "credits")}
              className="flex-1 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Ver {projectionsMode === "credits" ? "débitos futuros" : "créditos futuros"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet Lançar Ajuste Manual ─────────────────────────────── */}
      <SlidePanel
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Ajuste Manual de Saldo"
        widthMode="full"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button className="btn-brand border-0" disabled={actionLoading === "adj"} onClick={handleAdjustment}>
              {actionLoading === "adj" ? "Salvando…" : "Confirmar Ajuste"}
            </Button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {adjustWallet && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{adjustWallet.owner_name}</p>
              <p className="text-[11px] text-slate-400">{WALLET_OWNER_LABELS[adjustWallet.owner_type]} · Saldo atual: <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(adjustWallet.balance)}</span></p>
            </div>
          )}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Ajuste</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "credit", label: "Crédito (+)", icon: ArrowUpCircle, color: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" },
                  { value: "debit",  label: "Débito (−)",  icon: ArrowDownCircle, color: "text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30" },
                ].map(({ value, label, icon: Icon, color }) => (
                  <button key={value} type="button" onClick={() => setAdjustForm(f => ({ ...f, direction: value }))}
                    className={cn("flex items-center justify-center gap-2 h-10 rounded-lg border-2 text-xs font-semibold transition-colors",
                      adjustForm.direction === value ? color : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300")}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor <span className="text-red-500">*</span></Label>
              <Input type="number" placeholder="0.00" className="h-9 text-sm" value={adjustForm.amount}
                onChange={(e) => setAdjustForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Crédito bônus campanha, Estorno pagamento…" className="h-9 text-sm" value={adjustForm.description}
                onChange={(e) => setAdjustForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observação interna</Label>
              <Input placeholder="Motivo, referência, contexto…" className="h-9 text-sm" value={adjustForm.notes}
                onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
        </div>
        </div>
      </SlidePanel>
    </div>
  );
}
