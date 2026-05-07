// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  Building2,
  FolderOpen,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Banknote,
  Clock,
  Users,
  UserCheck,
  Pencil,
  Trash2,
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
  pending:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/40",
  paid:     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40",
  overdue:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-700/40",
  cancelled:"bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-600/40",
};

const WD_STATUS_LABELS = {
  aguardando_analise: "Aguardando",
  pagamento_agendado: "Agendado",
  pagamento_efetuado: "Pago",
  cancelado: "Cancelado",
  reprovado: "Reprovado",
};

const WD_STATUS_CLASSES = {
  aguardando_analise:"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/40",
  pagamento_agendado:"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-700/40",
  pagamento_efetuado:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40",
  cancelado:         "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-600/40",
  reprovado:         "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-700/40",
};

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs text-slate-500 px-1">{page} / {totalPages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminFinanceiroPage() {
  useSidebar();
  const { toast } = useToast();

  // invoices
  const [invoices, setInvoices] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const INV_PER_PAGE = 20;
  const [invSearch, setInvSearch] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState("all");
  const [invLoading, setInvLoading] = useState(true);
  const [billingStats, setBillingStats] = useState(null);

  // withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdLoading, setWdLoading] = useState(true);

  // UI
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // companies for form
  const [companies, setCompanies] = useState([]);

  // form
  const [form, setForm] = useState({
    company_id: "", project_id: "", amount: "", status: "pending",
    due_date: "", description: "", invoice_number: "",
  });

  // ── load invoices ──────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    setInvLoading(true);
    try {
      const filters = { limit: INV_PER_PAGE, page: invPage };
      if (invStatusFilter !== "all") filters.status = invStatusFilter;
      const [res, stats] = await Promise.all([
        apiClient.getInvoices(filters),
        apiClient.getBillingStats(),
      ]);
      setInvoices(res.data || []);
      setInvoiceTotal(res.total || 0);
      setBillingStats(stats);
    } catch (err) {
      console.error("[Financeiro] invoices:", err);
    } finally {
      setInvLoading(false);
    }
  }, [invPage, invStatusFilter]);

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

  // ── load companies ─────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.getCompanies({ limit: "200" })
      .then((r) => setCompanies(r.data || []))
      .catch(() => {});
  }, []);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!billingStats) return { paid: 0, pending: 0, overdue: 0 };
    const map = {};
    (billingStats.byStatus || []).forEach((s) => { map[s.status] = s.amount; });
    return {
      paid: map["paid"] ?? 0,
      pending: map["pending"] ?? 0,
      overdue: map["overdue"] ?? 0,
    };
  }, [billingStats]);

  const wdPending = useMemo(
    () => withdrawals.filter((w) => w.status === "aguardando_analise").length,
    [withdrawals]
  );

  // ── invoice search (client-side on current page) ───────────────────────────
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

  // ── sorting ────────────────────────────────────────────────────────────────
  const { sortKey: invSortKey, sortDir: invSortDir, handleSort: handleInvSort, sortData: sortInvoices } = useSorting();
  const { sortKey: wSortKey, sortDir: wSortDir, handleSort: handleWSort, sortData: sortWithdrawals } = useSorting();

  // ── invoice sheet ──────────────────────────────────────────────────────────
  function openCreateSheet() {
    setEditingInvoice(null);
    setForm({ company_id: "", project_id: "", amount: "", status: "pending", due_date: "", description: "", invoice_number: "" });
    setSheetOpen(true);
  }

  function openEditSheet(inv) {
    setEditingInvoice(inv);
    setForm({
      company_id: inv.company_id || "",
      project_id: inv.project_id || "",
      amount: String(inv.amount || ""),
      status: inv.status || "pending",
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : "",
      description: inv.description || "",
      invoice_number: inv.invoice_number || "",
    });
    setSheetOpen(true);
  }

  async function handleSaveInvoice() {
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      toast({ title: "Informe um valor válido", variant: "destructive" }); return;
    }
    const payload = { amount: parseFloat(form.amount), status: form.status };
    if (form.company_id) payload.company_id = form.company_id;
    if (form.project_id) payload.project_id = form.project_id;
    if (form.due_date) payload.due_date = new Date(form.due_date).toISOString();
    if (form.description) payload.description = form.description;
    if (form.invoice_number) payload.invoice_number = form.invoice_number;

    setActionLoading("save");
    try {
      if (editingInvoice) {
        await apiClient.updateInvoice(editingInvoice.id, payload);
        toast({ title: "Fatura atualizada com sucesso" });
      } else {
        await apiClient.createInvoice(payload);
        toast({ title: "Fatura criada com sucesso" });
      }
      setSheetOpen(false);
      loadInvoices();
    } catch (err) {
      toast({ title: "Erro ao salvar fatura", description: err?.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  async function handleMarkPaid(id) {
    setActionLoading(id);
    try {
      await apiClient.updateInvoice(id, { status: "paid", paid_at: new Date().toISOString() });
      toast({ title: "Fatura marcada como paga" });
      loadInvoices();
    } catch { toast({ title: "Erro ao atualizar fatura", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleMarkOverdue(id) {
    setActionLoading(id);
    try {
      await apiClient.updateInvoice(id, { status: "overdue" });
      toast({ title: "Fatura marcada como em atraso" });
      loadInvoices();
    } catch { toast({ title: "Erro ao atualizar fatura", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleCancelInvoice(id) {
    setActionLoading(id);
    try {
      await apiClient.updateInvoice(id, { status: "cancelled" });
      toast({ title: "Fatura cancelada" });
      loadInvoices();
    } catch { toast({ title: "Erro ao cancelar fatura", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteInvoice() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try {
      await apiClient.deleteInvoice(deleteTarget);
      toast({ title: "Fatura excluída" });
      setDeleteTarget(null);
      loadInvoices();
    } catch { toast({ title: "Erro ao excluir fatura", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function approveWithdrawal(id) {
    setActionLoading(id);
    try {
      await apiClient.updateWithdrawal(id, { status: "pagamento_efetuado", notes: "Aprovado e pago" });
      toast({ title: "Saque aprovado e pago" });
      loadWithdrawals();
    } catch { toast({ title: "Erro ao aprovar saque", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  async function rejectWithdrawal(id) {
    setActionLoading(id);
    try {
      await apiClient.updateWithdrawal(id, { status: "reprovado", notes: rejectNote });
      toast({ title: "Saque reprovado" });
      setRejectingId(null); setRejectNote("");
      loadWithdrawals();
    } catch { toast({ title: "Erro ao reprovar saque", variant: "destructive" }); }
    finally { setActionLoading(null); }
  }

  const invTotalPages = Math.max(1, Math.ceil(invoiceTotal / INV_PER_PAGE));

  if (invLoading && invoices.length === 0 && wdLoading) {
    return <PageLoader text="Carregando financeiro…" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão Financeira</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Faturas, recebimentos e saques da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadInvoices(); loadWithdrawals(); }} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreateSheet}>
            <Plus className="h-3.5 w-3.5" /> Nova Fatura
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-90">Receita Recebida</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(kpi.paid)}</p>
                <p className="text-xs opacity-70 mt-0.5">Faturas pagas</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2"><CheckCircle2 className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-90">A Receber</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(kpi.pending)}</p>
                <p className="text-xs opacity-70 mt-0.5">Faturas pendentes</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2"><Clock className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-90">Em Atraso</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{fmt(kpi.overdue)}</p>
                <p className="text-xs opacity-70 mt-0.5">Faturas vencidas</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2"><AlertCircle className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-md shadow-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-90">Saques Pendentes</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{wdPending}</p>
                <p className="text-xs opacity-70 mt-0.5">Aguardando análise</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2"><Banknote className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="faturas" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="faturas" className="gap-1.5 text-xs">
            <ReceiptText className="h-3.5 w-3.5" />
            Faturas
            {invoiceTotal > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                {invoiceTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="saques" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Saques de Parceiros
            {wdPending > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                {wdPending}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Faturas ─────────────────────────────────────────── */}
        <TabsContent value="faturas" className="space-y-4 mt-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar empresa, projeto, nº…"
                className="pl-9 h-8 text-xs"
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
              />
            </div>
            <Select value={invStatusFilter} onValueChange={(v) => { setInvStatusFilter(v); setInvPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Em Atraso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Pagination page={invPage} totalPages={invTotalPages} onPage={setInvPage} />
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreateSheet}>
                <Plus className="h-3.5 w-3.5" /> Nova Fatura
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-auto allka-table-scroll" style={{ maxHeight: "calc(100vh - 22rem)" }}>
              <table className="w-full text-sm">
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      <SortableHeader label="Nº / Descrição" field="invoice_number" type="text" sortKey={invSortKey ? String(invSortKey) : null} sortDir={invSortDir} onSort={handleInvSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Projeto</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      <SortableHeader label="Valor" field="amount" type="number" sortKey={invSortKey ? String(invSortKey) : null} sortDir={invSortDir} onSort={handleInvSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      <SortableHeader label="Vencimento" field="due_date" type="date" sortKey={invSortKey ? String(invSortKey) : null} sortDir={invSortDir} onSort={handleInvSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Carregando faturas…
                        </div>
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
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
                        <tr
                          key={inv.id}
                          className={idx % 2 === 0
                            ? "bg-[var(--table-row)] hover:bg-[var(--table-row-hover)]"
                            : "bg-[var(--table-row-alt)] hover:bg-[var(--table-row-hover)]"}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                              {inv.invoice_number || <span className="text-slate-400">—</span>}
                            </p>
                            {inv.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5 max-w-[180px] truncate">{inv.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {inv.company?.name || <span className="text-slate-400">—</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
                                {inv.project?.title || <span className="text-slate-400">—</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200 text-sm">
                            {fmt(inv.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
                                {fmtDate(inv.due_date)}
                              </span>
                            </div>
                            {inv.paid_at && (
                              <p className="text-[10px] text-emerald-600 mt-0.5">Pago em {fmtDate(inv.paid_at)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-[10px] font-semibold ${INVOICE_STATUS_CLASSES[inv.status] || ""}`}>
                              {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {(inv.status === "pending" || inv.status === "overdue") && (
                                <button disabled={actionLoading === inv.id} onClick={() => handleMarkPaid(inv.id)} title="Marcar como pago"
                                  className="h-7 w-7 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40">
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                              {inv.status === "pending" && (
                                <button disabled={actionLoading === inv.id} onClick={() => handleMarkOverdue(inv.id)} title="Marcar como em atraso"
                                  className="h-7 w-7 rounded flex items-center justify-center text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-40">
                                  <AlertCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => openEditSheet(inv)} title="Editar"
                                className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {inv.status !== "paid" && inv.status !== "cancelled" ? (
                                <button disabled={actionLoading === inv.id} onClick={() => handleCancelInvoice(inv.id)} title="Cancelar fatura"
                                  className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors disabled:opacity-40">
                                  <XCircle className="h-4 w-4" />
                                </button>
                              ) : (
                                <button disabled={actionLoading === inv.id} onClick={() => setDeleteTarget(inv.id)} title="Excluir fatura"
                                  className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors disabled:opacity-40">
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
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-400">{invoiceTotal} fatura{invoiceTotal !== 1 ? "s" : ""} no total</p>
              <Pagination page={invPage} totalPages={invTotalPages} onPage={setInvPage} />
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab Saques ──────────────────────────────────────────── */}
        <TabsContent value="saques" className="space-y-4 mt-0">
          {/* stats chips */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: "Aguardando", status: "aguardando_analise", icon: Clock, color: "text-amber-600" },
              { label: "Agendado",   status: "pagamento_agendado", icon: Calendar, color: "text-blue-600" },
              { label: "Pago",       status: "pagamento_efetuado", icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Reprovado",  status: "reprovado",          icon: XCircle, color: "text-red-500" },
            ].map(({ label, status, icon: Icon, color }) => {
              const count  = withdrawals.filter((w) => w.status === status).length;
              const amount = withdrawals.filter((w) => w.status === status).reduce((s, w) => s + (w.amount || 0), 0);
              return (
                <div key={status} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{count} {label}</span>
                  {amount > 0 && <span className="text-slate-400">· {fmt(amount)}</span>}
                </div>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-auto allka-table-scroll" style={{ maxHeight: "calc(100vh - 22rem)" }}>
              <table className="w-full text-sm">
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Parceiro" field="amount" type="text" sortKey={wSortKey ? String(wSortKey) : null} sortDir={wSortDir} onSort={handleWSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave PIX</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Valor" field="amount" type="number" sortKey={wSortKey ? String(wSortKey) : null} sortDir={wSortDir} onSort={handleWSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SortableHeader label="Solicitado em" field="created_at" type="date" sortKey={wSortKey ? String(wSortKey) : null} sortDir={wSortDir} onSort={handleWSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wdLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" /> Carregando saques…
                        </div>
                      </td>
                    </tr>
                  ) : withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="h-8 w-8 opacity-30" />
                          <p>Nenhuma solicitação de saque encontrada</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortWithdrawals(withdrawals).map((w, idx) => (
                      <tr
                        key={w.id}
                        className={idx % 2 === 0
                          ? "bg-[var(--table-row)] hover:bg-[var(--table-row-hover)]"
                          : "bg-[var(--table-row-alt)] hover:bg-[var(--table-row-hover)]"}
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{w.nomade?.user?.name || "—"}</p>
                          <p className="text-[11px] text-slate-400">{w.nomade?.user?.email || ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{w.pix_key || "—"}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{w.pix_key_type || ""}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200 text-sm">
                          {fmt(w.amount || 0)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {fmtDateTime(w.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] font-semibold ${WD_STATUS_CLASSES[w.status] || ""}`}>
                            {WD_STATUS_LABELS[w.status] || w.status}
                          </Badge>
                          {w.notes && w.status === "reprovado" && (
                            <p className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] truncate">{w.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {w.status === "aguardando_analise" ? (
                            rejectingId === w.id ? (
                              <div className="flex gap-1.5 items-center">
                                <input
                                  autoFocus
                                  className="h-7 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 w-36 focus:outline-none focus:ring-1 focus:ring-red-400"
                                  placeholder="Motivo…"
                                  value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)}
                                />
                                <button onClick={() => rejectWithdrawal(w.id)} className="h-7 px-2 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">OK</button>
                                <button onClick={() => { setRejectingId(null); setRejectNote(""); }} className="h-7 px-2 rounded border border-slate-200 dark:border-slate-600 text-slate-500 text-xs hover:bg-slate-50 dark:hover:bg-slate-700">X</button>
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
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                {withdrawals.length} solicitaç{withdrawals.length !== 1 ? "ões" : "ão"} no total
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sheet: Nova / Editar Fatura */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingInvoice ? "Editar Fatura" : "Nova Fatura"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
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
              <Select value={form.company_id} onValueChange={(v) => setForm((f) => ({ ...f, company_id: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Nenhuma —</SelectItem>
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
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={actionLoading === "save"} onClick={handleSaveInvoice}>
                {actionLoading === "save" ? "Salvando…" : editingInvoice ? "Salvar" : "Criar Fatura"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog: Confirmar exclusão */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Fatura"
        description="Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
}
