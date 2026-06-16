// @ts-nocheck
import { TrendingUp, TrendingDown, Minus, AlertCircle, Lock, Clock, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { IndicatorResult } from "../types";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatValue(value: number, meta: Record<string, unknown> = {}): string {
  const fmt = (meta.format as string) ?? "number";
  if (fmt === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency", currency: "BRL", maximumFractionDigits: 2,
    }).format(value);
  }
  if (fmt === "percent") return `${value.toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR").format(value);
}

// ─── Trend inline tag ─────────────────────────────────────────────────────────

function TrendTag({
  trend,
  variationPercent,
  light = false,
}: {
  trend?: string | null;
  variationPercent?: number | null;
  light?: boolean;
}) {
  if (trend == null || variationPercent == null) return null;
  const pct = Math.abs(variationPercent).toFixed(1);
  const isUp = trend === "up";
  const isDown = trend === "down";

  if (trend === "flat") {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${light ? "text-white/70" : "text-slate-500"}`}>
        <Minus className="h-2.5 w-2.5" />{pct}%
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
      light
        ? isUp ? "text-white/90" : "text-red-200"
        : isUp ? "text-emerald-600" : "text-red-500"
    }`}>
      {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {pct}%
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function IndicatorWidgetSkeleton({
  title,
  gradient,
}: {
  title?: string;
  gradient?: string;
}) {
  const isGrad = !!gradient;
  return (
    <div className={`relative rounded-xl overflow-hidden shadow-sm px-3 pt-2 pb-1.5 ${
      isGrad
        ? `bg-gradient-to-br ${gradient} animate-pulse`
        : "bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className={`h-2.5 w-20 rounded ${isGrad ? "bg-white/30" : "bg-slate-200 dark:bg-slate-700"}`} />
        <div className={`h-6 w-6 rounded-md ${isGrad ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`} />
      </div>
      <div className={`h-7 w-24 rounded mt-1 ${isGrad ? "bg-white/25" : "bg-slate-200 dark:bg-slate-700"}`} />
      <div className={`h-2 w-16 rounded mt-1.5 ${isGrad ? "bg-white/20" : "bg-slate-100 dark:bg-slate-600"}`} />
    </div>
  );
}

// ─── No-permission state ──────────────────────────────────────────────────────

function NoPermissionState({ title, gradient }: { title: string; gradient?: string }) {
  const isGrad = !!gradient;
  return (
    <div className={`relative rounded-xl overflow-hidden shadow-sm px-3 pt-2 pb-1.5 opacity-60 ${
      isGrad
        ? `bg-gradient-to-br ${gradient}`
        : "bg-white dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700"
    }`}>
      <p className={`text-xs font-medium leading-tight mb-1 ${isGrad ? "text-white/70" : "text-slate-400"}`}>{title}</p>
      <div className="flex items-center gap-1.5">
        <Lock className={`h-4 w-4 ${isGrad ? "text-white/60" : "text-slate-300"}`} />
        <span className={`text-sm font-semibold ${isGrad ? "text-white/80" : "text-slate-400"}`}>Sem permissão</span>
      </div>
    </div>
  );
}

// ─── Unavailable state ────────────────────────────────────────────────────────

const UNAVAILABLE_LABEL: Record<string, string> = {
  missing_model: "Não disponível",
  insufficient_scope: "Fora do escopo",
  no_permission: "Sem permissão",
  error: "Erro ao calcular",
};

function UnavailableState({
  title,
  reason,
  gradient,
}: {
  title: string;
  reason?: string;
  gradient?: string;
}) {
  const isGrad = !!gradient;
  return (
    <div className={`relative rounded-xl overflow-hidden shadow-sm px-3 pt-2 pb-1.5 opacity-60 ${
      isGrad
        ? `bg-gradient-to-br ${gradient}`
        : "bg-white dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700"
    }`}>
      <p className={`text-xs font-medium leading-tight mb-1 ${isGrad ? "text-white/70" : "text-slate-400"}`}>{title}</p>
      <div className="flex items-center gap-1.5">
        <Clock className={`h-4 w-4 ${isGrad ? "text-white/60" : "text-slate-300"}`} />
        <span className={`text-sm font-semibold ${isGrad ? "text-white/80" : "text-slate-400"}`}>
          {UNAVAILABLE_LABEL[reason ?? "error"] ?? "Indisponível"}
        </span>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm px-3 pt-2 pb-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
      <p className="text-xs font-medium text-red-400 leading-tight mb-1">{title}</p>
      <div className="flex items-start gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs text-red-600 dark:text-red-400 leading-snug line-clamp-2">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1"
        >
          <RefreshCw className="h-2.5 w-2.5" /> Tentar novamente
        </button>
      )}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

interface IndicatorWidgetProps {
  title: string;
  data: IndicatorResult | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onDrilldown?: (data: IndicatorResult) => void;
  gradient?: string; // e.g. "from-emerald-500 to-teal-700" — if set, renders as gradient card
  subtitle?: string; // e.g. "Últimos 30 dias"
  icon?: React.ReactNode;
  className?: string;
}

export function IndicatorWidget({
  title,
  data,
  loading,
  error,
  onRetry,
  onDrilldown,
  gradient,
  subtitle,
  icon,
  className = "",
}: IndicatorWidgetProps) {
  if (loading) return <IndicatorWidgetSkeleton title={title} gradient={gradient} />;

  if (error) {
    if (
      error.includes("403") ||
      error.toLowerCase().includes("sem permissão") ||
      error.toLowerCase().includes("acesso negado")
    ) {
      return <NoPermissionState title={title} gradient={gradient} />;
    }
    return <ErrorState title={title} message={error} onRetry={onRetry} />;
  }

  if (!data) return <IndicatorWidgetSkeleton title={title} gradient={gradient} />;

  if (data.unavailable) {
    if (data.unavailableReason === "no_permission") {
      return <NoPermissionState title={data.title ?? title} gradient={gradient} />;
    }
    return (
      <UnavailableState
        title={data.title ?? title}
        reason={data.unavailableReason}
        gradient={gradient}
      />
    );
  }

  const isGrad = !!gradient;
  const displayTitle = data.title ?? title;
  const isClickable = data.drilldownAvailable && onDrilldown;

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-sm px-3 pt-2 pb-1.5 transition-shadow ${
        isGrad
          ? `bg-gradient-to-br ${gradient}`
          : "bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
      } ${isClickable ? "cursor-pointer hover:shadow-md" : ""} ${className}`}
      onClick={isClickable ? () => onDrilldown(data) : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <p className={`text-xs font-medium leading-tight ${isGrad ? "text-white/70" : "text-slate-500 dark:text-slate-400"}`}>
          {displayTitle}
        </p>
        {icon && (
          <div className={`rounded-md p-1 ${isGrad ? "bg-white/20" : "bg-slate-50 dark:bg-slate-700"}`}>
            <span className={isGrad ? "text-white" : "text-slate-500"}>{icon}</span>
          </div>
        )}
      </div>

      <p className={`text-2xl font-bold leading-none tabular-nums ${isGrad ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>
        {data.value != null ? formatValue(data.value, data.meta) : "—"}
      </p>

      <div className="flex items-center gap-2 mt-0.5">
        <p className={`text-[10px] leading-tight ${isGrad ? "text-white/60" : "text-slate-400"}`}>
          {subtitle ?? (data.warnings?.[0] ?? "")}
        </p>
        <TrendTag trend={data.trend} variationPercent={data.variationPercent} light={isGrad} />
      </div>
    </div>
  );
}
