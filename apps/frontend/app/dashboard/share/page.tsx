// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, Clock } from "lucide-react";

import {
  decodeShareToken,
  makeFilterState,
  filterStateFromPeriod,
  type FilterState,
} from "@/lib/share-token";
import { fetchShareData, type ShareApiData, ShareApiError } from "@/lib/share-api";
import { SharedHeader, SharedFooter } from "./_components/shared-header";
import {
  SharedLoadingScreen,
  SharedInvalidScreen,
  SharedExpiredScreen,
  SharedPinScreen,
} from "./_components/shared-state-screens";
import {
  generateShareData,
  WIDGET_TITLES,
  SharedWidgetRenderer,
  SharedFullDashboardView,
  WidgetCard,
} from "./_components/shared-widget-renderer";
import { SharedFilterBar, PERIOD_OPTIONS } from "./_components/shared-filter-bar";

type PageState = "loading" | "pin_required" | "expired" | "invalid" | "ready";

// ─── URL ↔ filter state helpers ───────────────────────────────────────────────

function paramsToFilterState(
  params: URLSearchParams,
  fallback: FilterState,
): FilterState {
  const periodType = params.get("period") ?? fallback.periodType;
  const found = PERIOD_OPTIONS.find((o) => o.value === periodType);
  return {
    periodType,
    periodLabel: params.get("periodLabel") ?? found?.label ?? fallback.periodLabel,
    dateFrom: params.get("from") ?? fallback.dateFrom,
    dateTo: params.get("to") ?? fallback.dateTo,
    status: params.get("status") ?? fallback.status,
  };
}

function syncFiltersToParams(
  next: FilterState,
  base: FilterState,
  current: URLSearchParams,
): URLSearchParams {
  const p = new URLSearchParams(current);
  if (next.periodType !== base.periodType) {
    p.set("period", next.periodType);
    p.set("periodLabel", next.periodLabel);
  } else {
    p.delete("period");
    p.delete("periodLabel");
  }
  if (next.periodType === "custom") {
    if (next.dateFrom) p.set("from", next.dateFrom);
    else p.delete("from");
    if (next.dateTo) p.set("to", next.dateTo);
    else p.delete("to");
  } else {
    p.delete("from");
    p.delete("to");
  }
  if (next.status) p.set("status", next.status);
  else p.delete("status");
  return p;
}

// ─── Comment section ──────────────────────────────────────────────────────────
function CommentSection() {
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Deixar um comentário</h3>
      </div>
      <div className="p-5">
        {submitted ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Comentário enviado com sucesso!</span>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva seu comentário ou anotação sobre esses dados…"
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none transition-shadow"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {comment.length} / 500 caracteres
              </p>
              <Button
                size="sm"
                className="btn-brand"
                onClick={() => {
                  if (comment.trim()) setSubmitted(true);
                }}
                disabled={!comment.trim()}
              >
                Enviar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardSharePage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [config, setConfig] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // The original filter state derived from the token — never mutated after init.
  const [originalFilters, setOriginalFilters] = useState<FilterState>(makeFilterState());
  // The active (possibly viewer-overridden) filter state.
  const [activeFilters, setActiveFilters] = useState<FilterState>(makeFilterState());

  // Real API data state
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [shareData, setShareData] = useState<ShareApiData | null>(null);
  const [dataError, setDataError] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  // ── Parse + validate token ──
  const initOnce = useRef(false);
  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    const parsed = decodeShareToken(token);
    if (!parsed) { setPageState("invalid"); return; }
    if (parsed.expiry && new Date(parsed.expiry) < new Date()) {
      setConfig(parsed);
      setPageState("expired");
      return;
    }
    setConfig(parsed);
    // Initialize filters from URL params (supports shareable filtered links) or token period.
    if (!initOnce.current) {
      initOnce.current = true;
      const base = filterStateFromPeriod(parsed.period);
      setOriginalFilters(base);
      setActiveFilters(paramsToFilterState(searchParams, base));
    }
    setPageState(parsed.pin ? "pin_required" : "ready");
  }, [token]); // searchParams intentionally omitted — read once on init

  const handlePinSubmit = () => {
    if (!config) return;
    if (config.pin === pinInput) {
      setPinError(false);
      setPageState("ready");
    } else {
      setPinError(true);
    }
  };

  // ── Filter handlers ──
  const handleFilterChange = useCallback(
    (next: FilterState) => {
      setActiveFilters(next);
      setSearchParams(
        syncFiltersToParams(next, originalFilters, searchParams),
        { replace: true },
      );
    },
    [originalFilters, searchParams, setSearchParams],
  );

  const handleFilterReset = useCallback(() => {
    setActiveFilters(originalFilters);
    const p = new URLSearchParams(searchParams);
    ["period", "periodLabel", "from", "to", "status"].forEach((k) => p.delete(k));
    setSearchParams(p, { replace: true });
  }, [originalFilters, searchParams, setSearchParams]);

  // Fetch real data from API whenever page becomes ready, filters change, or user retries.
  useEffect(() => {
    if (pageState !== "ready" || !token) return;
    let cancelled = false;
    setDataState("loading");
    fetchShareData(token, activeFilters)
      .then((d) => {
        if (!cancelled) {
          setShareData(d);
          setDataState("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDataError(err instanceof ShareApiError ? err.message : "Erro ao carregar dados");
          setDataState("error");
        }
      });
    return () => { cancelled = true; };
  }, [pageState, token, activeFilters, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use real API data; fall back to mock while loading for seamless filter transitions.
  const data = shareData ?? generateShareData(activeFilters);

  // ── State gates ──
  if (pageState === "loading") return <SharedLoadingScreen />;
  if (pageState === "invalid") return <SharedInvalidScreen />;
  if (pageState === "expired") return <SharedExpiredScreen issuedAt={config?.issued} />;
  if (pageState === "pin_required") {
    return (
      <SharedPinScreen
        value={pinInput}
        onChange={(v) => {
          setPinInput(v);
          if (pinError) setPinError(false);
        }}
        onSubmit={handlePinSubmit}
        error={pinError}
        targetTitle={config?.target.title ?? ""}
      />
    );
  }

  // ── Ready — main layout ──
  // IMPORTANT: body has `overflow: hidden` globally (globals.css line 269).
  // This container uses `fixed inset-0 overflow-y-auto` to scroll independently.
  const widgetTitle = WIDGET_TITLES[config.target.id] ?? config.target.title;
  const { type } = config.target;

  // Viewers can change filters only if the token explicitly allows it.
  const canFilter = config.allowFilterChanges === true;

  const displayPeriod = canFilter
    ? activeFilters.periodLabel
    : (config.period?.label ?? null);

  const periodModified =
    canFilter && activeFilters.periodLabel !== (config.period?.label ?? "");

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-50 dark:bg-background">
      <div className="min-h-full flex flex-col">
        {/* ── Header ── */}
        <SharedHeader config={config} widgetTitle={widgetTitle} />

        {/* ── Main content ── */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

          {/* Content label + title + period */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {type === "widget" ? "Widget" : "Dashboard"}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {type === "dashboard" ? config.target.title : widgetTitle}
              </h2>
              {displayPeriod && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {displayPeriod}
                  {periodModified && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(200,26,127,0.1)", color: "#c81a7f" }}>
                      modificado
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* ── Filter bar (comment permission only) ── */}
          {canFilter && (
            <SharedFilterBar
              filters={activeFilters}
              originalFilters={originalFilters}
              onChange={handleFilterChange}
              onReset={handleFilterReset}
              profile={config.profile}
            />
          )}

          {/* ── Widget or full dashboard ── */}
          {dataState === "error" ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
              <p className="text-sm font-medium text-destructive">{dataError}</p>
              <Button variant="outline" size="sm" onClick={() => setRetryCount((c) => c + 1)}>
                Tentar novamente
              </Button>
            </div>
          ) : dataState === "loading" && !shareData ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="relative">
              {dataState === "loading" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 rounded-2xl">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
              {type === "widget" ? (
                <WidgetCard title={widgetTitle}>
                  <SharedWidgetRenderer widgetId={config.target.id} data={data} />
                </WidgetCard>
              ) : (
                <SharedFullDashboardView data={data} />
              )}
            </div>
          )}

          {/* ── Comment section (only for "comment" permission) ── */}
          {config.permission === "comment" && (
            <CommentSection />
          )}
        </main>

        {/* ── Footer ── */}
        <SharedFooter config={config} />
      </div>
    </div>
  );
}
