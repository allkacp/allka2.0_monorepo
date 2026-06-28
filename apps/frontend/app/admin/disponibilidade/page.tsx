// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading";
import { ExportButton } from "@/components/export-button";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Briefcase,
  Activity,
  ListChecks,
  Filter,
  Search,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseList(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string" && val.trim().startsWith("[")) {
    try {
      return JSON.parse(val).filter(Boolean);
    } catch {}
  }
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
}

function hoursAgo(dateStr) {
  if (!dateStr) return 9999;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 36e5);
}

// ─── traffic-light rules ─────────────────────────────────────────────────────

function specLight(available) {
  if (available < 2) return "red";
  if (available < 5) return "yellow";
  return "green";
}
function taskLight(waiting, oldestH) {
  if (waiting === 0) return "green";
  if (waiting >= 3 || oldestH >= 48) return "red";
  return "yellow";
}

const LIGHTS = {
  red: {
    color: "#ef4444",
    dimColor: "#7f1d1d",
    label: "Crítico",
    badge:
      "bg-red-50    text-red-700    border-red-200    dark:bg-red-950/30    dark:text-red-400    dark:border-red-700/40",
  },
  yellow: {
    color: "#f59e0b",
    dimColor: "#78350f",
    label: "Atenção",
    badge:
      "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/30  dark:text-amber-400  dark:border-amber-700/40",
  },
  green: {
    color: "#10b981",
    dimColor: "#064e3b",
    label: "OK",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40",
  },
  gray: {
    color: "#64748b",
    dimColor: "#1e293b",
    label: "Sem dados",
    badge: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

/* ── Mini traffic-light component (inline styles → always renders correctly) */
function Farol({ light }) {
  const order = ["red", "yellow", "green"];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "5px 6px",
        background: "#1e293b",
        borderRadius: 6,
        border: "1px solid rgba(148,163,184,0.2)",
        flexShrink: 0,
      }}
    >
      {order.map((l) => {
        const active = light === l;
        const c = LIGHTS[l];
        return (
          <span
            key={l}
            style={{
              display: "inline-block",
              width: active ? 10 : 8,
              height: active ? 10 : 8,
              borderRadius: "50%",
              background: active ? c.color : c.dimColor,
              boxShadow: active ? `0 0 7px 2px ${c.color}88` : "none",
              transition: "all .2s",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Dot for legend / footer */
function Dot({ light, size = 10 }) {
  const c = LIGHTS[light] ?? LIGHTS.gray;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.color,
        flexShrink: 0,
      }}
    />
  );
}

/* ── Gradient stat card — same as Empresas */
const GRAD = {
  blue: { from: "#3b82f6", to: "#1d4ed8", border: "rgba(59,130,246,.35)" },
  green: { from: "#10b981", to: "#0d9488", border: "rgba(16,185,129,.35)" },
  red: { from: "#ef4444", to: "#dc2626", border: "rgba(239,68,68,.35)" },
  amber: { from: "#f59e0b", to: "#d97706", border: "rgba(245,158,11,.35)" },
  violet: { from: "#8b5cf6", to: "#7c3aed", border: "rgba(139,92,246,.35)" },
};

function StatCard({ label, value, icon: Icon, color }) {
  const g = GRAD[color] ?? GRAD.blue;
  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        padding: "12px 14px",
        background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
        border: `1px solid ${g.border}`,
        boxShadow: "0 4px 16px rgba(0,0,0,.18)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,.75)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight: 1,
          }}
        >
          {label}
        </p>
        <div
          style={{
            background: "rgba(255,255,255,.2)",
            borderRadius: 6,
            padding: 5,
          }}
        >
          <Icon style={{ width: 13, height: 13, color: "#fff" }} />
        </div>
      </div>
      <p
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#fff",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Utilization bar */
function UtilBar({ pct }) {
  const bg = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#10b981";
  return (
    <div
      style={{
        width: "100%",
        background: "rgba(148,163,184,0.2)",
        borderRadius: 9,
        height: 5,
      }}
    >
      <div
        style={{
          height: 5,
          borderRadius: 9,
          background: bg,
          width: `${Math.min(100, pct)}%`,
          transition: "width .3s",
        }}
      />
    </div>
  );
}

const SORT_ORD = { red: 0, yellow: 1, green: 2, gray: 3 };

const TABS = [
  { key: "specialty", label: "Por Especialidade", icon: Briefcase },
  { key: "task", label: "Por Tarefa", icon: ListChecks },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDisponibilidadePage() {
  useSidebar();
  const [nomades, setNomades] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("specialty");
  const [lightFilter, setLightFilter] = useState("all");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [nd, sp, tk] = await Promise.all([
        apiClient.getNomades({ limit: 500 }),
        apiClient.getSpecialties({ limit: 200 }),
        apiClient.getTasks({ limit: 500 }),
      ]);
      setNomades(Array.isArray(nd) ? nd : nd?.data || []);
      setSpecialties(Array.isArray(sp) ? sp : sp?.data || []);
      setTasks(Array.isArray(tk) ? tk : tk?.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Specialty groups ──────────────────────────────────────────────────────
  const specGroups = useMemo(() => {
    const map = {};
    // seed from specialties table
    specialties.forEach((sp) => {
      map[sp.name] = {
        name: sp.name,
        category: sp.category || "—",
        hourly_rate: sp.hourly_rate || 0,
        total: 0,
        active: 0,
      };
    });
    // count nomades per specialty
    nomades.forEach((n) => {
      const keys =
        parseList(n.specialties).length > 0
          ? parseList(n.specialties)
          : parseList(n.specialty).length > 0
            ? parseList(n.specialty)
            : parseList(n.areas_of_interest).length > 0
              ? parseList(n.areas_of_interest)
              : ["Geral"];

      keys.forEach((k) => {
        if (!map[k])
          map[k] = {
            name: k,
            category: "—",
            hourly_rate: 0,
            total: 0,
            active: 0,
          };
        map[k].total += 1;
        const active =
          n.status === "ativo" ||
          n.status === "active" ||
          n.is_active !== false;
        if (active) map[k].active += 1;
      });
    });
    return Object.values(map)
      .filter((g) => g.total > 0)
      .map((g) => ({ ...g, light: specLight(g.active) }))
      .sort(
        (a, b) => SORT_ORD[a.light] - SORT_ORD[b.light] || b.total - a.total,
      );
  }, [nomades, specialties]);

  const filteredSpec = useMemo(() => {
    let arr = specGroups;
    if (lightFilter !== "all") arr = arr.filter((g) => g.light === lightFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [specGroups, search, lightFilter]);

  // ── Task groups ───────────────────────────────────────────────────────────
  const taskGroups = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const key = t.template?.name || t.title || "Sem título";
      const cat = t.template?.category || t.category_snapshot || "—";
      if (!map[key])
        map[key] = {
          name: key,
          category: cat,
          total: 0,
          waiting: 0,
          inProgress: 0,
          oldestDate: null,
        };
      map[key].total += 1;
      const waiting =
        t.status === "launched" ||
        t.status === "AGUARDANDO_NOMADE" ||
        t.status === "LIBERADA_PARA_EXECUCAO";
      const inProg = t.status === "in_progress" || t.status === "EM_EXECUCAO";
      if (waiting) {
        map[key].waiting += 1;
        const d = t.created_at || t.launched_at;
        if (!map[key].oldestDate || d < map[key].oldestDate)
          map[key].oldestDate = d;
      }
      if (inProg) map[key].inProgress += 1;
    });
    return Object.values(map)
      .filter((g) => g.total > 0)
      .map((g) => {
        const h = g.oldestDate ? hoursAgo(g.oldestDate) : 0;
        return { ...g, oldestHours: h, light: taskLight(g.waiting, h) };
      })
      .sort(
        (a, b) =>
          SORT_ORD[a.light] - SORT_ORD[b.light] || b.waiting - a.waiting,
      );
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let arr = taskGroups;
    if (lightFilter !== "all") arr = arr.filter((g) => g.light === lightFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [taskGroups, search, lightFilter]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalN = nomades.length;
    const activeN = nomades.filter(
      (n) =>
        n.status === "ativo" || n.status === "active" || n.is_active !== false,
    ).length;
    const critical = specGroups.filter((g) => g.light === "red").length;
    const attention = specGroups.filter((g) => g.light === "yellow").length;
    const ok = specGroups.filter((g) => g.light === "green").length;
    const waiting = taskGroups.reduce((s, g) => s + g.waiting, 0);
    return { totalN, activeN, critical, attention, ok, waiting };
  }, [nomades, specGroups, taskGroups]);

  if (loading) return <PageLoader text="Carregando disponibilidade…" />;

  const TH =
    "text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap";
  const theadStyle = {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "var(--table-head)",
    boxShadow: "0 1px 0 rgba(148,163,184,0.25)",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disponibilidade"
        description="Monitoramento em tempo real de nômades e tarefas"
        actions={<>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={refreshing}
            className={`h-9 gap-1.5 text-xs transition-all duration-300 ${
              refreshing
                ? "border-blue-400 text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : ""
            }`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-500" : ""}`}
            />
            {refreshing ? "Atualizando…" : "Atualizar"}
          </Button>
          <ExportButton filename="disponibilidade" />
        </>}
      />

      {/* ── KPI gradient cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard
          label="Nômades"
          value={kpi.totalN}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Disponíveis"
          value={kpi.activeN}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Crítico"
          value={kpi.critical}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          label="Atenção"
          value={kpi.attention}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard label="OK" value={kpi.ok} icon={CheckCircle2} color="green" />
        <StatCard
          label="Aguardando"
          value={kpi.waiting}
          icon={Clock}
          color="violet"
        />
      </div>

      {/* ── Legenda ── */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          Legenda:
        </span>
        {(["green", "yellow", "red"] as const).map((l) => (
          <span key={l} className="flex items-center gap-1.5">
            <Dot light={l} size={9} />
            <span>
              {LIGHTS[l].label}
              {l === "green"
                ? " — ≥ 5 disponíveis"
                : l === "yellow"
                  ? " — 2–4 disponíveis"
                  : " — < 2 disponíveis"}
            </span>
          </span>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setSearch("");
              setLightFilter("all");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Tabela card ── */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* toolbar inside card */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={
                tab === "specialty" ? "Buscar especialidade…" : "Buscar tarefa…"
              }
              className="pl-9 h-9 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            {tab === "specialty" ? (
              <>
                {filteredSpec.length} de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {specGroups.length}
                </span>{" "}
                especialidade{specGroups.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                {filteredTasks.length} de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {taskGroups.length}
                </span>{" "}
                tarefa{taskGroups.length !== 1 ? "s" : ""}
              </>
            )}
          </span>

          {/* farol filter pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Todos */}
            <button
              onClick={() => setLightFilter("all")}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                lightFilter === "all"
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow"
                  : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
              }`}
            >
              Todos
            </button>
            {(["red", "yellow", "green"] as const).map((l) => {
              const active = lightFilter === l;
              const ldata = LIGHTS[l];
              return (
                <button
                  key={l}
                  onClick={() => setLightFilter(l)}
                  style={
                    active
                      ? {
                          background: ldata.color,
                          border: `2px solid ${ldata.color}`,
                          color: l === "yellow" ? "#78350f" : "#fff",
                          boxShadow: `0 2px 10px ${ldata.color}55`,
                        }
                      : {}
                  }
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center gap-1.5 ${
                    active
                      ? ""
                      : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                  }`}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      display: "inline-block",
                      background: active
                        ? l === "yellow"
                          ? "#78350f"
                          : "rgba(255,255,255,0.7)"
                        : ldata.color,
                      flexShrink: 0,
                    }}
                  />
                  {ldata.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Por Especialidade ── */}
        {tab === "specialty" && (
          <div
            className="overflow-auto"
            style={{ maxHeight: "calc(100vh - 28rem)" }}
          >
            <table className="w-full text-sm">
              <thead style={theadStyle}>
                <tr>
                  <th className={TH}>Status</th>
                  <th className={TH}>Especialidade</th>
                  <th className={TH}>Categoria</th>
                  <th className={TH}>Total</th>
                  <th className={TH}>Disponíveis</th>
                  <th className={TH}>Em Atividade</th>
                  <th className={TH} style={{ minWidth: 140 }}>
                    Utilização
                  </th>
                  <th className={TH}>R$/h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSpec.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Briefcase className="h-8 w-8 opacity-30" />
                        <p className="text-sm">
                          Nenhuma especialidade encontrada
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSpec.map((g, i) => {
                    const pct =
                      g.total > 0
                        ? Math.round(((g.total - g.active) / g.total) * 100)
                        : 0;
                    const lm = LIGHTS[g.light] ?? LIGHTS.gray;
                    return (
                      <tr
                        key={g.name}
                        className={`${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Farol light={g.light} />
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold whitespace-nowrap ${lm.badge}`}
                            >
                              {lm.label}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 shrink-0">
                              <Briefcase className="h-3 w-3 text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                              {g.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-600"
                          >
                            {g.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
                          {g.total}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            style={{
                              color:
                                g.active < 2
                                  ? "#ef4444"
                                  : g.active < 5
                                    ? "#f59e0b"
                                    : "#10b981",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {g.active}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-slate-500">
                          {g.total - g.active}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color:
                                  pct >= 80
                                    ? "#ef4444"
                                    : pct >= 60
                                      ? "#f59e0b"
                                      : "#10b981",
                                width: 28,
                                flexShrink: 0,
                              }}
                            >
                              {pct}%
                            </span>
                            <div style={{ flex: 1 }}>
                              <UtilBar pct={pct} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {g.hourly_rate > 0
                            ? `R$ ${Number(g.hourly_rate).toFixed(2)}/h`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Por Tarefa ── */}
        {tab === "task" && (
          <div
            className="overflow-auto"
            style={{ maxHeight: "calc(100vh - 28rem)" }}
          >
            <table className="w-full text-sm">
              <thead style={theadStyle}>
                <tr>
                  <th className={TH}>Status</th>
                  <th className={TH}>Tarefa</th>
                  <th className={TH}>Categoria</th>
                  <th className={TH}>Total</th>
                  <th className={TH}>Aguardando Nômade</th>
                  <th className={TH}>Em Execução</th>
                  <th className={TH}>Aguardando há</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ListChecks className="h-8 w-8 opacity-30" />
                        <p className="text-sm">Nenhuma tarefa encontrada</p>
                        <p className="text-xs opacity-60">
                          As tarefas aparecem quando são lançadas
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-slate-400"
                    >
                      Nenhuma tarefa neste filtro
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((g, i) => {
                    const lm = LIGHTS[g.light] ?? LIGHTS.gray;
                    const waitLabel =
                      g.waiting === 0
                        ? "—"
                        : g.oldestHours < 1
                          ? "< 1h"
                          : g.oldestHours < 24
                            ? `${g.oldestHours}h`
                            : `${Math.round(g.oldestHours / 24)}d`;
                    return (
                      <tr
                        key={g.name}
                        className={`${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Farol light={g.light} />
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold whitespace-nowrap ${lm.badge}`}
                            >
                              {lm.label}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-50">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-950/30 shrink-0">
                              <ListChecks className="h-3 w-3 text-violet-400" />
                            </div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {g.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-600"
                          >
                            {g.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
                          {g.total}
                        </td>
                        <td className="px-4 py-3">
                          {g.waiting > 0 ? (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontWeight: 700,
                                fontSize: 12,
                                color: g.waiting >= 3 ? "#ef4444" : "#f59e0b",
                              }}
                            >
                              <Clock style={{ width: 12, height: 12 }} />
                              {g.waiting}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontWeight: 700,
                                fontSize: 12,
                                color: "#10b981",
                              }}
                            >
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-slate-500">
                          {g.inProgress}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color:
                                g.oldestHours >= 48
                                  ? "#ef4444"
                                  : g.oldestHours >= 24
                                    ? "#f59e0b"
                                    : "#94a3b8",
                            }}
                          >
                            {waitLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20">
          <p className="text-xs text-slate-400">
            {tab === "specialty"
              ? `${nomades.length} nômades · ${specGroups.length} especialidades`
              : `${tasks.length} tarefas no total`}
          </p>
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            {(["red", "yellow", "green"] as const).map((l) => (
              <span key={l} className="flex items-center gap-1">
                <Dot light={l} size={8} />
                {tab === "specialty"
                  ? specGroups.filter((g) => g.light === l).length
                  : taskGroups.filter((g) => g.light === l).length}{" "}
                {LIGHTS[l].label}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
