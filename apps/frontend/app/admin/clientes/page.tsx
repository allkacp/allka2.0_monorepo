// @ts-nocheck
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Building2,
  Users,
  FolderOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Phone,
  Mail,
  Tag,
  Plus,
  Eye,
  Filter,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import {
  getCompanyTypeLabel,
  getCompanyTypeInfo,
  getCompanyTypeColor,
  formatCompanySequenceId,
} from "@/lib/company-type";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "/api";

function getToken() {
  try { return localStorage.getItem("allka_token"); } catch { return null; }
}

async function apiFetch(path: string, params?: Record<string, string>) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

const STATUS_CONFIG: Record<string, { label: string; color: "emerald" | "slate" | "blue" | "red" }> = {
  ativo:        { label: "Ativo",        color: "emerald" },
  inativo:      { label: "Inativo",      color: "slate"   },
  prospecto:    { label: "Prospecto",    color: "blue"    },
  inadimplente: { label: "Inadimplente", color: "red"     },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "slate" as const };
  return <NeonBadge color={cfg.color}>{cfg.label}</NeonBadge>;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

type ColKey = "empresa" | "segmento" | "contato" | "projetos" | "usuarios" | "faturas" | "status" | "tipo" | "cadastro";
const ALL_COLUMNS: { key: ColKey; label: string; info: string }[] = [
  { key: "empresa", label: "Empresa", info: "Nome, CNPJ e código sequencial da empresa." },
  { key: "segmento", label: "Segmento", info: "Segmento de mercado informado no cadastro." },
  { key: "contato", label: "Contato", info: "E-mail, telefone e site da empresa." },
  { key: "projetos", label: "Projetos", info: "Quantidade de projetos vinculados." },
  { key: "usuarios", label: "Usuários", info: "Quantidade de usuários vinculados." },
  { key: "faturas", label: "Faturas", info: "Quantidade de faturas emitidas." },
  { key: "status", label: "Status", info: "Situação comercial do cliente." },
  { key: "tipo", label: "Tipo", info: "Tipo de conta (Company, Agency, Nomad ou Partner)." },
  { key: "cadastro", label: "Cadastro", info: "Data em que o cliente foi cadastrado." },
];
const DEFAULT_VISIBLE: ColKey[] = ["empresa", "segmento", "contato", "projetos", "usuarios", "status", "tipo"];

export default function AdminClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));

  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } =
    useSorting<any>();

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
      const data = await apiFetch("/clients", params);
      setClients(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

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
        const idCode = formatCompanySequenceId(c.sequence_number);
        return (
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.cnpj?.toLowerCase().includes(q) ||
          idCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [clients, searchInput]);

  const rows = useMemo(() => sortData(clients), [clients, sortData]);
  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));
  const totalPages = Math.ceil(total / pageSize);

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div ref={pageRef} className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Clientes"
        description="Todas as empresas clientes cadastradas na plataforma"
        actions={
          <>
            <ExportButton pageRef={pageRef} filename="clientes" />
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="/admin/empresas"
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all no-underline"
                  >
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                    />
                    <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      Nova Empresa
                    </span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Cadastrar nova empresa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Clientes",   value: total,                                                        icon: Building2, color: "text-blue-600"    },
          { label: "Projetos Vinculados", value: clients.reduce((s, c) => s + (c._count?.projects ?? 0), 0),  icon: FolderOpen, color: "text-violet-600" },
          { label: "Usuários Vinculados", value: clients.reduce((s, c) => s + (c._count?.users ?? 0), 0),     icon: Users,     color: "text-emerald-600" },
          { label: "Faturas Emitidas",    value: clients.reduce((s, c) => s + (c._count?.invoices ?? 0), 0),  icon: Tag,       color: "text-amber-600"   },
        ].map((s) => (
          <div key={s.label} className="bg-background border border-border/70 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div ref={searchBoxRef} className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Nome, ID, e-mail ou CNPJ..."
            value={searchInput}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchFocused && searchInput && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-y-auto">
              {searchSuggestions.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-2">Nenhum resultado</p>
              ) : (
                searchSuggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSearchInput(c.name);
                      setSearch(c.name);
                      setSearchFocused(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{formatCompanySequenceId(c.sequence_number)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <IconToolbarButton icon={Filter} tooltip="Filtros" onClick={() => setFilterPanelOpen(true)} />
        <IconToolbarButton icon={Settings2} tooltip="Configurar colunas" onClick={() => setColConfigOpen(true)} />

        <ItemsPerPageSelect
          value={pageSize.toString()}
          onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
        />

        {total > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground ml-auto cursor-default">
                  {total} cliente{total !== 1 ? "s" : ""} no total
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Total de clientes cadastrados</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Table */}
      <div className="bg-background border border-border/70 rounded-xl shadow-sm overflow-hidden">
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
          <div className="overflow-x-auto allka-table-scroll">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide ${
                        ["projetos", "usuarios", "faturas"].includes(col.key) ? "text-center" : "text-left"
                      }`}
                    >
                      <div className="inline-flex items-center gap-1">
                        <SortableHeader
                          label={col.label}
                          field={col.key === "empresa" ? "name" : col.key === "cadastro" ? "created_at" : col.key}
                          type={col.key === "cadastro" ? "date" : ["projetos", "usuarios", "faturas"].includes(col.key) ? "number" : "text"}
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
                  <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
                      i % 2 === 0 ? "bg-white dark:bg-slate-900/30" : "bg-zinc-50 dark:bg-slate-800/20"
                    }`}
                  >
                    {visibleCols.has("empresa") && (
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{formatCompanySequenceId(c.sequence_number)}</div>
                        {c.cnpj && <div className="text-xs text-muted-foreground mt-0.5">{c.cnpj}</div>}
                      </td>
                    )}
                    {visibleCols.has("segmento") && (
                      <td className="py-3 px-4">
                        {c.segment ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Tag className="h-3 w-3" />{c.segment}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                    )}
                    {visibleCols.has("contato") && (
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {c.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />{c.phone}
                            </div>
                          )}
                          {c.website && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3 shrink-0" />
                              <a href={c.website} target="_blank" rel="noopener noreferrer" className="truncate max-w-[130px] hover:underline">
                                {c.website.replace(/^https?:\/\//, "")}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleCols.has("projetos") && (
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-medium text-sm">
                          <FolderOpen className="h-3.5 w-3.5 text-violet-500" />
                          {c._count?.projects ?? 0}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("usuarios") && (
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-medium text-sm">
                          <Users className="h-3.5 w-3.5 text-blue-500" />
                          {c._count?.users ?? 0}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("faturas") && (
                      <td className="py-3 px-4 text-center font-medium text-sm">
                        {c._count?.invoices ?? 0}
                      </td>
                    )}
                    {visibleCols.has("status") && (
                      <td className="py-3 px-4">
                        <StatusBadge status={c.status ?? "ativo"} />
                      </td>
                    )}
                    {visibleCols.has("tipo") && (
                      <td className="py-3 px-4">
                        <NeonBadge color={getCompanyTypeColor(c.type)} tooltip={getCompanyTypeInfo(c.type)}>
                          {getCompanyTypeLabel(c.type)}
                        </NeonBadge>
                      </td>
                    )}
                    {visibleCols.has("cadastro") && (
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {c.created_at ? fmtDate(c.created_at) : "—"}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={`/admin/empresas/${c.id}`}
                              className="group relative inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden transition-all"
                            >
                              <span
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                              />
                              <Eye className="relative z-10 h-3.5 w-3.5 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="left">Ver detalhes completos</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/60 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} no total
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/60 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

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
    </div>
  );
}
