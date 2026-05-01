// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Star,
  Package,
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Filter,
  Trophy,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { mockProductNomades } from "@/dev-mocks/data/product-nomads";
import { cn } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

function StarRating({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "xs";
}) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const sizeClass = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span className="inline-flex items-center gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < full
              ? "fill-amber-400 text-amber-400"
              : i === full && half
                ? "fill-amber-200 text-amber-400"
                : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; icon: React.ElementType; cls: string }
  > = {
    active: {
      label: "Ativo",
      icon: CheckCircle2,
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
    },
    inactive: {
      label: "Inativo",
      icon: XCircle,
      cls: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
    },
    pending: {
      label: "Pendente",
      icon: Clock,
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
    },
    suspended: {
      label: "Suspenso",
      icon: AlertCircle,
      cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
    },
  };
  const cfg = map[status] ?? map.inactive;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
        cfg.cls,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function LevelBadge({ level }: { level: string | null }) {
  if (!level)
    return <span className="text-[10px] text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    Junior: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    Pleno: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    Senior:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    Expert:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
        map[level] ?? "bg-muted text-muted-foreground",
      )}
    >
      <Trophy className="h-2.5 w-2.5" />
      {level}
    </span>
  );
}

function ApprovalBar({ rate }: { rate: number }) {
  const color =
    rate >= 95
      ? "bg-emerald-500"
      : rate >= 80
        ? "bg-blue-500"
        : rate >= 60
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {rate}%
      </span>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ProductNomadsTabProps {
  productId: string;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ProductNomadsTab({ productId }: ProductNomadsTabProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [expandedNomade, setExpandedNomade] = useState<string | null>(null);

  const nomades = useMemo(
    () => mockProductNomades[productId] ?? [],
    [productId],
  );

  const filtered = useMemo(() => {
    return nomades.filter((n) => {
      const matchSearch =
        !search ||
        n.nomadeName.toLowerCase().includes(search.toLowerCase()) ||
        (n.city ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "all" || n.nomadeStatus === filterStatus;
      const matchLevel = filterLevel === "all" || n.nomadeLevel === filterLevel;
      return matchSearch && matchStatus && matchLevel;
    });
  }, [nomades, search, filterStatus, filterLevel]);

  const activeCount = nomades.filter((n) => n.nomadeStatus === "active").length;
  const avgRating =
    nomades.length > 0
      ? (
          nomades.reduce((s, n) => s + n.overallRating, 0) / nomades.length
        ).toFixed(1)
      : "—";
  const totalDeliveries = nomades.reduce((s, n) => s + n.overallDeliveries, 0);

  if (nomades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Users className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Nenhum nômade habilitado
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Ainda não há nômades habilitados para este produto. Os nômades
          aparecem aqui após aprovação no teste de habilitação.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ── Métricas resumidas ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  Habilitados
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">
                  {nomades.length}
                  {activeCount < nomades.length && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({activeCount} ativos)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                <Star className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  Nota Média
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">
                  {avgRating}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">
                    /5
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  Entregas
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">
                  {totalDeliveries}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nômade..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-32 gap-1">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os status
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                Ativo
              </SelectItem>
              <SelectItem value="inactive" className="text-xs">
                Inativo
              </SelectItem>
              <SelectItem value="suspended" className="text-xs">
                Suspenso
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="h-8 text-xs w-28 gap-1">
              <Trophy className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os níveis
              </SelectItem>
              <SelectItem value="Junior" className="text-xs">
                Junior
              </SelectItem>
              <SelectItem value="Pleno" className="text-xs">
                Pleno
              </SelectItem>
              <SelectItem value="Senior" className="text-xs">
                Senior
              </SelectItem>
              <SelectItem value="Expert" className="text-xs">
                Expert
              </SelectItem>
            </SelectContent>
          </Select>
          {filtered.length < nomades.length && (
            <span className="text-[10px] text-muted-foreground">
              {filtered.length} de {nomades.length}
            </span>
          )}
        </div>

        {/* ── Lista de nômades ── */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Nenhum nômade encontrado com os filtros aplicados.
            </div>
          ) : (
            filtered.map((nomade) => {
              const isExpanded = expandedNomade === nomade.nomadeId;
              return (
                <div
                  key={nomade.nomadeId}
                  className={cn(
                    "rounded-xl border transition-all",
                    nomade.nomadeStatus === "active"
                      ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40"
                      : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 opacity-75",
                  )}
                >
                  {/* Header da row */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedNomade(isExpanded ? null : nomade.nomadeId)
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none",
                        nomade.nomadeStatus === "active"
                          ? "bg-gradient-to-br from-blue-500 to-violet-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500",
                      )}
                    >
                      {nomade.nomadeName
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {nomade.nomadeName}
                        </span>
                        <LevelBadge level={nomade.nomadeLevel} />
                        <StatusBadge status={nomade.nomadeStatus} />
                      </div>
                      {(nomade.city || nomade.state) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="text-[10px] text-muted-foreground">
                            {[nomade.city, nomade.state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Métricas compactas */}
                    <div className="flex items-center gap-4 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1">
                              <StarRating
                                value={nomade.overallRating}
                                size="xs"
                              />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                {nomade.overallRating.toFixed(1)}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {nomade.overallDeliveries} entregas
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Nota média geral neste produto
                        </TooltipContent>
                      </Tooltip>

                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {nomade.enabledTasks.length} tarefa
                          {nomade.enabledTasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "text-[10px] transition-transform duration-200",
                          isExpanded ? "rotate-180" : "rotate-0",
                        )}
                      >
                        ▼
                      </span>
                    </div>
                  </button>

                  {/* Detalhes expandidos — tarefas */}
                  {isExpanded && (
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700 px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <ShieldCheck className="h-3 w-3 text-blue-500" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Tarefas Habilitadas · {nomade.testCode}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {nomade.enabledTasks.map((task) => (
                          <div
                            key={task.taskId}
                            className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                {task.taskName}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {task.taskId}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <StarRating
                                  value={task.averageRating}
                                  size="xs"
                                />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                  {task.averageRating.toFixed(1)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({task.totalDeliveries})
                                </span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <ApprovalBar rate={task.approvalRate} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Taxa de aprovação: {task.approvalRate}%
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Habilitado em{" "}
                        {new Date(nomade.qualifiedAt).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
