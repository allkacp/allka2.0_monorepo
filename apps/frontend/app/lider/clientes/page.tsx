"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Building2,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Phone,
  Mail,
  Tag,
  Plus,
  Filter,
  Settings2,
  Hash,
  MapPin,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import { apiClient } from "@/lib/api-client";

// Tela somente leitura do Leader — mesma base real de clientes de
// /admin/clientes e /agency/clientes, servida por /api/client-records
// (NÃO /api/clients, legado de Company). Leader vê todos os clientes,
// independente do vínculo, mas não pode criar, editar ou alterar vínculo.
interface ClientLink {
  id: string;
  agency_id: string | null;
  company_id: string | null;
  partner_id: string | null;
  status: string;
}

interface ClientRecord {
  id: string;
  sequence_number: number;
  name: string;
  type: "pj" | "pf";
  document: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  segment: string | null;
  status: string;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  avatar: string | null;
  notes: string | null;
  description: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  links: ClientLink[];
}

function formatClientSequenceId(seq: number): string {
  return `cli_${String(seq).padStart(5, "0")}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

const clientInitials = (name: string) =>
  (name || "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
const avatarColors = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-pink-500 to-rose-700",
];
const avatarColor = (index: number) => avatarColors[Math.abs(index) % avatarColors.length];

function ClientAvatar({ client, index }: { client: ClientRecord; index: number }) {
  if (client.avatar) {
    return (
      <img
        src={client.avatar}
        alt={client.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm"
      />
    );
  }
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(index)} flex items-center justify-center flex-shrink-0 shadow-sm`}
    >
      <span className="text-xs font-bold text-white">{clientInitials(client.name)}</span>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: "emerald" | "slate" | "blue" }> = {
  active: { label: "Ativo", color: "emerald" },
  inactive: { label: "Inativo", color: "slate" },
  prospect: { label: "Prospecto", color: "blue" },
};
const STATUS_DOT_CLASSES: Record<string, string> = {
  active: "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_12px_rgba(16,185,129,0.65)] dark:bg-emerald-800/70 dark:text-emerald-100",
  inactive: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
  prospect: "border-blue-500 bg-blue-200 text-blue-900 shadow-[0_0_12px_rgba(59,130,246,0.65)] dark:bg-blue-800/70 dark:text-blue-100",
};
const STATUS_DOT_BG: Record<string, string> = {
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  prospect: "bg-blue-500",
};

type ColKey = "id" | "cliente" | "segmento" | "contato" | "tipo" | "vinculo" | "status" | "cadastro";
const ALL_COLUMNS: { key: ColKey; label: string; info: string }[] = [
  { key: "id", label: "ID", info: "Código sequencial do cliente." },
  { key: "cliente", label: "Cliente", info: "Nome e documento do cliente." },
  { key: "segmento", label: "Segmento", info: "Segmento de mercado informado no cadastro." },
  { key: "contato", label: "Contato", info: "E-mail, telefone e site do cliente." },
  { key: "tipo", label: "Tipo", info: "Pessoa Jurídica (PJ) ou Pessoa Física (PF)." },
  { key: "vinculo", label: "Vínculo", info: "Agency, Company ou Partner responsável por este cliente." },
  { key: "status", label: "Status", info: "Situação comercial do cliente." },
  { key: "cadastro", label: "Cadastro", info: "Data em que o cliente foi cadastrado." },
];
const DEFAULT_VISIBLE: ColKey[] = ["id", "cliente", "segmento", "contato", "tipo", "vinculo", "status", "cadastro"];

const STAT_COLOR_MAP = {
  blue: {
    gradient: "from-blue-500 to-blue-700",
    darkGradient: "dark:from-blue-800 dark:to-blue-950",
    borderClass: "border-2 border-blue-300/70 dark:border-blue-800/70",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    darkGradient: "dark:from-violet-800 dark:to-purple-950",
    borderClass: "border-2 border-violet-300/70 dark:border-violet-800/70",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-800 dark:to-teal-900",
    borderClass: "border-2 border-emerald-300/70 dark:border-emerald-800/70",
  },
  orange: {
    gradient: "from-orange-500 to-rose-600",
    darkGradient: "dark:from-orange-800 dark:to-rose-900",
    borderClass: "border-2 border-orange-300/70 dark:border-orange-800/70",
  },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: keyof typeof STAT_COLOR_MAP;
}) {
  const colors = STAT_COLOR_MAP[color];
  return (
    <div
      className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} shadow-lg hover:shadow-xl`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">{label}</span>
          <div className="bg-white/20 rounded-md p-1">
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

type LinkType = "none" | "agency" | "company" | "partner";

export default function LiderClientesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useItemsPerPage("lider-clientes", 10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [pageJumpValue, setPageJumpValue] = useState("");

  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoPanelClient, setInfoPanelClient] = useState<ClientRecord | null>(null);
  const openInfoPanel = useCallback((client: ClientRecord) => {
    setInfoPanelClient(client);
    setInfoPanelOpen(true);
  }, []);

  // ── Vínculo: opções carregadas uma vez, só para exibir o nome real na tabela/painel ──
  const [linkOptions, setLinkOptions] = useState<{
    agency: { id: string; name: string }[];
    company: { id: string; name: string }[];
    partner: { id: string; name: string }[];
  }>({ agency: [], company: [], partner: [] });

  const loadLinkOptions = useCallback(async () => {
    try {
      const [ag, co, pa] = await Promise.all([
        apiClient.getAgencies({ limit: "200" }),
        apiClient.getCompanies({ limit: "200" }),
        apiClient.getPartners({ limit: "200" }),
      ]);
      setLinkOptions({
        agency: ((ag as any).data || []).map((a: any) => ({ id: a.id, name: a.name })),
        company: ((co as any).data || []).map((c: any) => ({ id: c.id, name: c.name })),
        partner: ((pa as any).data || []).map((p: any) => ({ id: p.id, name: p.user?.name || p.user?.email || p.id })),
      });
    } catch (err) {
      console.error("[LiderClientes] Failed to load link options:", err);
    }
  }, []);

  useEffect(() => {
    loadLinkOptions();
  }, [loadLinkOptions]);

  const agencyNameById = useMemo(() => Object.fromEntries(linkOptions.agency.map((a) => [a.id, a.name])), [linkOptions]);
  const companyNameById = useMemo(() => Object.fromEntries(linkOptions.company.map((c) => [c.id, c.name])), [linkOptions]);
  const partnerNameById = useMemo(() => Object.fromEntries(linkOptions.partner.map((p) => [p.id, p.name])), [linkOptions]);

  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } =
    useSorting<ClientRecord>();

  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([loading, visibleCols.size]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (search) params.search = search;
      if (statusFilter.size === 1) params.status = Array.from(statusFilter)[0];
      const data: any = await apiClient.getClientRecords(params);
      setClients(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  };

  const searchSuggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter((c) => {
        const idCode = formatClientSequenceId(c.sequence_number);
        return (
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.document?.toLowerCase().includes(q) ||
          idCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [clients, searchInput]);

  const rows = useMemo(() => sortData(clients), [clients, sortData]);
  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));
  const totalPages = Math.ceil(total / pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
      if (totalPages > maxVisible) pages.push("...");
    } else if (page >= totalPages - halfVisible) {
      pages.push("...");
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push("...");
      for (let i = page - halfVisible; i <= page + halfVisible; i++) pages.push(i);
      pages.push("...");
    }
    return pages;
  };

  const commitPageJump = () => {
    const n = parseInt(pageJumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
    setPageJumpValue("");
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalPj = clients.filter((c) => c.type === "pj").length;
  const totalPf = clients.filter((c) => c.type === "pf").length;
  const totalActive = clients.filter((c) => c.status === "active").length;

  const PaginationControls = () => (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        title="Página anterior"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {getPageNumbers().map((p, index) =>
        p === "..." ? (
          <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
        ) : (
          <button
            key={index}
            onClick={() => setPage(Number(p))}
            title={p === page ? "Página atual" : `Ir para a página ${p}`}
            className={`h-7 w-7 flex items-center justify-center rounded-[8px] text-xs font-bold transition-colors ${
              p === page
                ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            }`}
            style={p === page ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        title="Próxima página"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
            {(() => {
              const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
              const end = Math.min(page * pageSize, total);
              return (
                <>
                  {start}-{end} de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{total}</span>{" "}
                  cliente{total !== 1 ? "s" : ""}
                </>
              );
            })()}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          Intervalo de clientes exibido nesta página, do total encontrado
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div ref={pageRef} className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Clientes"
        description="Todos os clientes reais da plataforma — vinculados a Agency, Company, Partner ou sem vínculo (somente leitura)"
        actions={<ExportButton pageRef={pageRef} filename="clientes" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total de Clientes" value={total} icon={Tag} color="blue" />
        <StatCard label="Pessoa Jurídica" value={totalPj} icon={Building2} color="violet" />
        <StatCard label="Pessoa Física" value={totalPf} icon={User} color="emerald" />
        <StatCard label="Ativos" value={totalActive} icon={Tag} color="orange" />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
          <div ref={searchBoxRef} className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Nome, ID, e-mail ou documento..."
              value={searchInput}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchFocused && searchInput && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-y-auto">
                {searchSuggestions.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">Nenhum resultado</p>
                ) : (
                  searchSuggestions.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSearchInput(c.name);
                        setSearch(c.name);
                        setSearchFocused(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <ClientAvatar client={c} index={i} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{formatClientSequenceId(c.sequence_number)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconToolbarButton icon={Filter} tooltip="Filtros" onClick={() => setFilterPanelOpen(true)} />
            <IconToolbarButton icon={Settings2} tooltip="Configurar colunas" onClick={() => setColConfigOpen(true)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
              variant="top"
            />
            <CountText side="bottom" />
          </div>

          {hasHorizontalOverflow && (
            <div
              ref={topScrollRef}
              onScroll={handleTopBarScroll}
              title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
              className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
              style={{ height: 12 }}
            >
              <div style={{ minWidth: 1020, height: 1 }} />
            </div>
          )}

          {totalPages > 1 && <PaginationControls />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando clientes...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={load} className="text-xs underline">Tentar novamente</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Building2 className="h-8 w-8 opacity-40" />
            <span className="text-sm">Nenhum cliente encontrado</span>
          </div>
        ) : (
          <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
            <table className="w-full text-xs min-w-[1020px]">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  <th
                    className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                    style={{ position: "sticky", left: 0, top: 0, zIndex: 3, minWidth: 56, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(100,116,139,0.18)" }}
                  >
                    Ações
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none [&_button]:!text-[11px]"
                      style={{
                        textAlign: "left",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                        borderRight: "1px solid rgba(148,163,184,0.16)",
                      }}
                    >
                      <div className="inline-flex items-center gap-1">
                        <SortableHeader
                          label={col.label}
                          field={col.key === "id" ? "sequence_number" : col.key === "cliente" ? "name" : col.key === "cadastro" ? "created_at" : col.key}
                          type={col.key === "cadastro" ? "date" : col.key === "id" ? "number" : "text"}
                          sortKey={sortKey as string}
                          sortDir={sortDir}
                          onSort={handleSort}
                          columnFilters={columnFilters}
                          onFilter={toggleColumnFilter}
                          onClearFilter={clearColumnFilter}
                          filterValues={col.key === "status" ? Object.keys(STATUS_CONFIG) : undefined}
                        />
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
              <tbody>
                {rows.map((c, i) => {
                  const link = c.links[0];
                  const linkType: LinkType = !link ? "none" : link.agency_id ? "agency" : link.company_id ? "company" : "partner";
                  const linkName =
                    linkType === "agency" ? agencyNameById[link!.agency_id!] :
                    linkType === "company" ? companyNameById[link!.company_id!] :
                    linkType === "partner" ? partnerNameById[link!.partner_id!] : undefined;
                  return (
                  <tr
                    key={c.id}
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
                      style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 56, borderRight: "1px solid rgba(100,116,139,0.18)" }}
                    >
                      <div className="flex items-center justify-center">
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); openInfoPanel(c); }}
                                className="h-[21px] w-[21px] flex items-center justify-center rounded-full bg-[#2558FF] text-white shadow-[0_2px_6px_rgba(37,88,255,0.35)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:shadow-[0_2px_10px_rgba(110,44,150,0.5)] transition-all"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Mais informações</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>

                    {visibleCols.has("id") && (
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        {formatClientSequenceId(c.sequence_number)}
                      </td>
                    )}
                    {visibleCols.has("cliente") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-3">
                          <ClientAvatar client={c} index={i} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                            {c.document && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{c.document}</p>}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleCols.has("segmento") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        {c.segment ? (
                          <span className="inline-flex items-center gap-1 text-[13px] text-slate-600 dark:text-slate-400">
                            <Tag className="h-3 w-3" />{c.segment}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}
                    {visibleCols.has("contato") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="space-y-1">
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[13px] text-slate-300 dark:text-slate-600">
                              <Mail className="h-3 w-3 flex-shrink-0" /><span>—</span>
                            </div>
                          )}
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-500">
                              <Phone className="h-3 w-3 flex-shrink-0" />{c.phone}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[13px] text-slate-300 dark:text-slate-600">
                              <Phone className="h-3 w-3 flex-shrink-0" /><span>—</span>
                            </div>
                          )}
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-500 hover:underline">
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[130px]">{c.website.replace(/^https?:\/\//, "")}</span>
                            </a>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleCols.has("tipo") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <NeonBadge color={c.type === "pj" ? "blue" : "violet"} tooltip={c.type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}>
                          {c.type === "pj" ? "PJ" : "PF"}
                        </NeonBadge>
                      </td>
                    )}
                    {visibleCols.has("vinculo") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex flex-col gap-0.5">
                          {linkType === "none" ? (
                            <span className="text-slate-300 dark:text-slate-600 text-[13px]">Sem vínculo</span>
                          ) : (
                            <>
                              <NeonBadge color={linkType === "agency" ? "blue" : linkType === "company" ? "violet" : "emerald"}>
                                {linkType === "agency" ? "Agency" : linkType === "company" ? "Company" : "Partner"}
                              </NeonBadge>
                              {linkName && <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{linkName}</span>}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleCols.has("status") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${STATUS_DOT_CLASSES[c.status] ?? STATUS_DOT_CLASSES.active}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_BG[c.status] ?? STATUS_DOT_BG.active}`} />
                          {STATUS_CONFIG[c.status]?.label ?? c.status ?? "Ativo"}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("cadastro") && (
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {c.created_at ? fmtDate(c.created_at) : "—"}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
            <div className="flex items-center gap-3">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
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
                <div style={{ minWidth: 1020, height: 1 }} />
              </div>
            )}

            {totalPages > 1 && <PaginationControls />}
          </div>
        )}
      </div>

      {/* Filtros panel */}
      <SlidePanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        title="Filtros"
        subtitle="Filtre a lista de clientes por status"
        widthMode="compact"
        compactWidth={360}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilter.has(key)}
                onChange={() => {
                  setStatusFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  });
                  setPage(1);
                }}
              />
              <NeonBadge color={cfg.color}>{cfg.label}</NeonBadge>
            </label>
          ))}
        </div>
      </SlidePanel>

      {/* Column config panel */}
      <SlidePanel
        open={colConfigOpen}
        onClose={() => setColConfigOpen(false)}
        title="Configurar colunas"
        subtitle="Escolha quais colunas aparecem na tabela"
        widthMode="compact"
        compactWidth={360}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-2">
          {ALL_COLUMNS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer py-1">
              <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} />
              {col.label}
            </label>
          ))}
        </div>
      </SlidePanel>

      {/* "+" info panel */}
      <SlidePanel
        open={infoPanelOpen}
        onClose={() => setInfoPanelOpen(false)}
        title={
          infoPanelClient ? (
            <div className="flex items-center gap-3">
              <ClientAvatar client={infoPanelClient} index={0} />
              <div className="min-w-0">
                <p className="truncate">{infoPanelClient.name}</p>
              </div>
            </div>
          ) : (
            "Cliente"
          )
        }
        subtitle={
          infoPanelClient
            ? `${formatClientSequenceId(infoPanelClient.sequence_number)} · ${infoPanelClient.address || "Endereço não informado"}`
            : undefined
        }
        widthMode="compact"
        compactWidth={480}
      >
        {infoPanelClient && (() => {
          const link = infoPanelClient.links[0];
          const linkType: LinkType = !link ? "none" : link.agency_id ? "agency" : link.company_id ? "company" : "partner";
          const linkName =
            linkType === "agency" ? agencyNameById[link!.agency_id!] :
            linkType === "company" ? companyNameById[link!.company_id!] :
            linkType === "partner" ? partnerNameById[link!.partner_id!] : undefined;
          return (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Dados do cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Contato</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      {infoPanelClient.email || "—"}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 mt-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      {infoPanelClient.phone || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Documento · Tipo</p>
                    <p className="flex items-center gap-1.5 text-sm font-mono text-slate-700 dark:text-slate-300">
                      <Hash className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      {infoPanelClient.document || "—"}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      {infoPanelClient.type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Status</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${STATUS_DOT_CLASSES[infoPanelClient.status] ?? STATUS_DOT_CLASSES.active}`}>
                      {STATUS_CONFIG[infoPanelClient.status]?.label ?? infoPanelClient.status ?? "Ativo"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Vínculo</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                      <Link2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      {linkType === "none" ? "Sem vínculo" : `${linkType === "agency" ? "Agency" : linkType === "company" ? "Company" : "Partner"}${linkName ? " · " + linkName : ""}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 sm:col-span-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Endereço</p>
                    <p className="flex items-start gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>
                        {[
                          [infoPanelClient.address, infoPanelClient.number].filter(Boolean).join(", "),
                          infoPanelClient.neighborhood,
                          infoPanelClient.city,
                          infoPanelClient.state,
                          infoPanelClient.zip_code,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Não informado"}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 sm:col-span-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cadastrado em</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {infoPanelClient.created_at ? fmtDate(infoPanelClient.created_at) : "—"}
                    </p>
                  </div>
                  {infoPanelClient.notes && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 sm:col-span-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Observações</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{infoPanelClient.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </SlidePanel>
    </div>
  );
}
