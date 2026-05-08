// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading";
import {
  Users, CheckCircle2, Target, TrendingUp, RefreshCw, Search,
} from "lucide-react";

function UtilBar({ pct }) {
  const color = pct >= 80 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function AdminDisponibilidadePage() {
  useSidebar();
  const [nomades, setNomades] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [nd, sp] = await Promise.all([
        apiClient.getNomades({ limit: 500 }),
        apiClient.getSpecialties({ limit: 100 }),
      ]);
      setNomades(Array.isArray(nd) ? nd : nd?.data || []);
      setSpecialties(Array.isArray(sp) ? sp : sp?.data || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const map = {};
    specialties.forEach(sp => {
      map[sp.name] = map[sp.name] || { name: sp.name, category: sp.category, hourly_rate: sp.hourly_rate, total: 0, active: 0 };
    });
    nomades.forEach(n => {
      const key = n.specialty || n.areas_of_interest || "Geral";
      if (!map[key]) map[key] = { name: key, category: "—", hourly_rate: 0, total: 0, active: 0 };
      map[key].total += 1;
      if (n.status === "ativo" || n.is_active !== false) map[key].active += 1;
    });
    return Object.values(map).filter(g => g.total > 0).sort((a, b) => b.total - a.total);
  }, [nomades, specialties]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(q) || (g.category || "").toLowerCase().includes(q));
  }, [groups, search]);

  const totalNomades  = nomades.length;
  const totalActive   = nomades.filter(n => n.status === "ativo" || n.is_active !== false).length;
  const totalInactive = totalNomades - totalActive;
  const utilPct       = totalNomades > 0 ? Math.round((totalInactive / totalNomades) * 100) : 0;

  if (loading) return <PageLoader text="Carregando disponibilidade…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Disponibilidade</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Capacidade dos nômades por especialidade</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Nômades",  value: totalNomades,   icon: Users,        color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Disponíveis",    value: totalActive,    icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Em Atividade",   value: totalInactive,  icon: Target,       color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Utilização",     value: `${utilPct}%`,  icon: TrendingUp,   color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input placeholder="Filtrar especialidade…" className="pl-9 h-8 text-xs"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--table-head)" }}>
              <tr>
                {["Especialidade","Categoria","Total","Disponíveis","Em Atividade","Utilização","Valor/h"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-7 w-7 opacity-30" />
                    <p>Nenhuma especialidade com nômades encontrada</p>
                  </div>
                </td></tr>
              ) : filtered.map((g, i) => {
                const pct = g.total > 0 ? Math.round(((g.total - g.active) / g.total) * 100) : 0;
                const badgeCls = pct >= 80
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-700/40"
                  : pct >= 60
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/40"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40";
                return (
                  <tr key={g.name} className={`${i % 2 === 0 ? "bg-[var(--table-row)]" : "bg-[var(--table-row-alt)]"} hover:bg-[var(--table-row-hover)] transition-colors`}>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-100">{g.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize">{g.category || "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{g.total}</td>
                    <td className="px-4 py-3 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{g.active}</td>
                    <td className="px-4 py-3 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">{g.total - g.active}</td>
                    <td className="px-4 py-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${badgeCls}`}>{pct}%</Badge>
                        <div className="flex-1 min-w-[60px]"><UtilBar pct={pct} /></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {g.hourly_rate > 0 ? `R$ ${Number(g.hourly_rate).toFixed(2)}/h` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400">{filtered.length} especialidade{filtered.length !== 1 ? "s" : ""} · {totalNomades} nômades</p>
        </div>
      </Card>
    </div>
  );
}
