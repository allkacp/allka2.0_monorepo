// @ts-nocheck
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ativo:        { label: "Ativo",        color: "bg-green-100 text-green-700"   },
  inativo:      { label: "Inativo",      color: "bg-slate-100 text-slate-500"   },
  prospecto:    { label: "Prospecto",    color: "bg-blue-100 text-blue-700"     },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-700"       },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function AgenciaClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("agencia-clientes", 20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(itemsPerPage),
      };
      if (search) params.search = search;
      const data = await apiFetch("/clients", params);
      setClients(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [page, search, itemsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div ref={pageRef} className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Clientes"
        description="Empresas atendidas pela sua agência"
        actions={<ExportButton pageRef={pageRef} filename="clientes-agencia" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Total de Clientes",    value: total,                  icon: Building2, color: "text-blue-600"    },
          { label: "Projetos Vinculados",  value: clients.reduce((s, c) => s + (c._count?.projects ?? 0), 0), icon: FolderOpen, color: "text-violet-600" },
          { label: "Usuários Vinculados",  value: clients.reduce((s, c) => s + (c._count?.users ?? 0), 0),   icon: Users,     color: "text-emerald-600" },
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

      {/* Search + count */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar por nome, e-mail ou CNPJ..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <ItemsPerPageSelect
            value={itemsPerPage.toString()}
            onValueChange={(v) => { setItemsPerPage(Number(v)); setPage(1); }}
            variant="top"
          />
          {total > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {total} cliente{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
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
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Building2 className="h-8 w-8 opacity-40" />
            <span className="text-sm">Nenhum cliente encontrado</span>
            <span className="text-xs">Os clientes aparecerão aqui quando tiverem projetos vinculados à sua agência.</span>
          </div>
        ) : (
          <div className="overflow-x-auto allka-table-scroll">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Empresa</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Segmento</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Contato</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Projetos</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Usuários</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                      {c.cnpj && <div className="text-xs text-muted-foreground mt-0.5">{c.cnpj}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {c.segment ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Tag className="h-3 w-3" />{c.segment}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
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
                            <a href={c.website} target="_blank" rel="noopener noreferrer" className="truncate max-w-[140px] hover:underline">
                              {c.website.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-sm">
                        <FolderOpen className="h-3.5 w-3.5 text-violet-500" />
                        {c._count?.projects ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-sm">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        {c._count?.users ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status ?? "ativo"} />
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
            Página {page} de {totalPages}
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
    </div>
  );
}
