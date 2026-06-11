// @ts-nocheck
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Eye,
  MessageSquare,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  CalendarDays,
  BarChart2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { SharePayload } from "@/lib/share-token";
import { PROFILE_LABELS, PROFILE_COLORS } from "@/lib/share-token";

type SharedHeaderProps = {
  config: SharePayload;
  widgetTitle: string;
};

// ─── Allka wordmark ───────────────────────────────────────────────────────────
function AllkaLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight select-none",
        className,
      )}
    >
      Allka
    </span>
  );
}

// ─── Header principal com gradiente da marca ──────────────────────────────────
export function SharedHeader({ config, widgetTitle }: SharedHeaderProps) {
  const [copied, setCopied] = useState(false);
  const issuedAt = config.issued ? new Date(config.issued) : null;
  const expiresAt = config.expiry ? new Date(config.expiry) : null;
  const displayTitle =
    config.target.type === "dashboard" ? config.target.title : widgetTitle;
  const typeLabel =
    config.target.type === "widget" ? "Widget compartilhado" : "Dashboard compartilhado";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <header className="app-brand-header relative overflow-hidden shrink-0">
      {/* Noise/texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Accent glow blobs */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#c81a7f]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 left-1/4 w-36 h-36 rounded-full bg-[#1a2a6f]/30 blur-2xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {/* Top row: brand + actions */}
        <div className="flex items-center justify-between gap-3 mb-3">
          {/* Allka brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/20 shrink-0">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <AllkaLogo className="text-white text-sm" />
              <p className="text-[10px] text-white/60 leading-none mt-0.5">
                Relatório compartilhado
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyLink}
              className="h-7 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/15 gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {copied ? "Copiado!" : "Copiar link"}
              </span>
            </Button>
          </div>
        </div>

        {/* Report title + meta */}
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
            {displayTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-white/60">{typeLabel}</span>

            {issuedAt && (
              <span className="flex items-center gap-1 text-[11px] text-white/50">
                <CalendarDays className="h-3 w-3" />
                {format(issuedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}

            {config.period?.label && (
              <span className="flex items-center gap-1 text-[11px] text-white/50">
                <Clock className="h-3 w-3" />
                {config.period.label}
              </span>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {/* Profile */}
          {config.profile && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/15 text-white/90 border border-white/20 rounded-full px-2 py-0.5">
              <ShieldCheck className="h-2.5 w-2.5" />
              {PROFILE_LABELS[config.profile]}
            </span>
          )}

          {/* Permission */}
          {config.permission === "comment" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/15 text-white/90 border border-white/20 rounded-full px-2 py-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              Comentar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/15 text-white/90 border border-white/20 rounded-full px-2 py-0.5">
              <Eye className="h-2.5 w-2.5" />
              Somente leitura
            </span>
          )}

          {/* Expiry */}
          {expiresAt && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-full px-2 py-0.5">
              <Clock className="h-2.5 w-2.5" />
              Expira {format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function SharedFooter({ config }: { config: SharePayload }) {
  return (
    <footer className="border-t bg-card/50 py-5 mt-auto shrink-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #000 0%, #1a2a6f 50%, #c81a7f 100%)" }}
          >
            <BarChart2 className="h-2.5 w-2.5 text-white" />
          </div>
          <span>
            Powered by <strong className="text-foreground">Allka</strong>
          </span>
        </div>
        <span className="text-center sm:text-right">
          Link público ·{" "}
          {config.permission === "view"
            ? "Somente visualização"
            : "Visualização + Comentários"}
          {config.profile && ` · ${PROFILE_LABELS[config.profile]}`}
        </span>
      </div>
    </footer>
  );
}
