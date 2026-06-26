// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Loader2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "/api";
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

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  bronze:   { label: "Bronze",   color: "bg-amber-100 text-amber-800"    },
  silver:   { label: "Prata",    color: "bg-slate-100 text-slate-700"    },
  gold:     { label: "Ouro",     color: "bg-yellow-100 text-yellow-800"  },
  platinum: { label: "Platina",  color: "bg-cyan-100 text-cyan-800"      },
  diamond:  { label: "Diamante", color: "bg-violet-100 text-violet-800"  },
  leader:   { label: "Líder",    color: "bg-emerald-100 text-emerald-800" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ativo:                { label: "Ativo",            color: "bg-green-100 text-green-700"  },
  inativo:              { label: "Inativo",           color: "bg-slate-100 text-slate-500"  },
  aguardando_aprovacao: { label: "Aguardando",        color: "bg-amber-100 text-amber-700"  },
  reprovado:            { label: "Reprovado",         color: "bg-red-100 text-red-700"      },
  pausado:              { label: "Pausado",           color: "bg-orange-100 text-orange-700" },
};

function LevelBadge({ level }: { level: string }) {
  const cfg = LEVEL_CONFIG[level] ?? { label: level, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function LiderNomadesPage() {
  const [nomades, setNomades] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/lider/nomades", {
        page:  String(page),
        limit: String(PAGE_SIZE),
      });
      setNomades(data.nomades ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar nômades");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Nômades da Área"
        description={`${total} nômade${total !== 1 ? "s" : ""} ativos na sua área`}
      />

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        ) : nomades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Users className="h-8 w-8 opacity-40" />
            <span className="text-sm">Nenhum nômade encontrado na sua área.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-border">
                  <th className="px-5 py-3 text-left font-medium">Nome</th>
                  <th className="px-5 py-3 text-left font-medium">E-mail</th>
                  <th className="px-5 py-3 text-left font-medium">Nível</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Score</th>
                  <th className="px-5 py-3 text-right font-medium">Tarefas Concluídas</th>
                  <th className="px-5 py-3 text-right font-medium">Avaliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-border">
                {nomades.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-foreground">{n.name}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-muted-foreground">{n.email}</td>
                    <td className="px-5 py-3"><LevelBadge level={n.level} /></td>
                    <td className="px-5 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-700 dark:text-foreground">{n.score}</td>
                    <td className="px-5 py-3 text-right text-slate-600 dark:text-muted-foreground">{n.tasks_completed_total}</td>
                    <td className="px-5 py-3 text-right text-slate-600 dark:text-muted-foreground">
                      {n.performance_avg_rating ? n.performance_avg_rating.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-slate-400">
            Página {page} de {totalPages} · {total} nômade{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
