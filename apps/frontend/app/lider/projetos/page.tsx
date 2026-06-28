// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  FolderOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "/api";
const PAGE_SIZE = 20;

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
  draft:            { label: "Rascunho",         color: "bg-slate-100 text-slate-600"   },
  negotiation:      { label: "Negociação",        color: "bg-yellow-100 text-yellow-700" },
  "awaiting-payment": { label: "Aguard. Pagto",  color: "bg-orange-100 text-orange-700" },
  planning:         { label: "Planejamento",      color: "bg-blue-100 text-blue-700"    },
  "in-progress":    { label: "Em andamento",      color: "bg-emerald-100 text-emerald-700" },
  paused:           { label: "Pausado",           color: "bg-amber-100 text-amber-700"  },
  completed:        { label: "Concluído",         color: "bg-green-100 text-green-800"  },
  cancelled:        { label: "Cancelado",         color: "bg-red-100 text-red-700"      },
  paid:             { label: "Pago",              color: "bg-teal-100 text-teal-700"    },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function LiderProjetosPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      const data = await apiFetch("/projects", params);
      setProjects(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats
  const totalValue = projects.reduce((s, p) => s + (p.value ?? 0), 0);
  const activeCount = projects.filter((p) =>
    ["in-progress", "planning", "negotiation"].includes(p.status)
  ).length;

  return (
    <div ref={pageRef} className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Projetos"
        description="Visão geral de todos os projetos da plataforma"
        actions={<ExportButton pageRef={pageRef} filename="projetos-lider" />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Projetos", value: total, icon: FolderOpen, color: "text-blue-600" },
          { label: "Em Andamento", value: activeCount, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Volume Total", value: fmt(totalValue), icon: DollarSign, color: "text-violet-600" },
          { label: "Nesta Página", value: projects.length, icon: Building2, color: "text-slate-600" },
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

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar projeto..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {total} projeto{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-background border border-border/70 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando projetos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={load} className="text-xs underline">Tentar novamente</button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <FolderOpen className="h-8 w-8 opacity-40" />
            <span className="text-sm">Nenhum projeto encontrado</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Projeto</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Empresa</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Agência</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                      {p.type && <div className="text-xs text-muted-foreground mt-0.5">{p.type}</div>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                      {p.client?.name ?? <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                      {p.agency ?? <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                      {p.value ? fmt(p.value) : <span className="text-muted-foreground/60">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmtDate(p.created_at)}
                      </div>
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
