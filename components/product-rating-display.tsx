// @ts-nocheck
"use client";

import { Star } from "lucide-react";
import { computeProductRating } from "@/dev-mocks/data/product-nomads";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductRatingDisplayProps {
  productId: string;
  size?: "xs" | "sm" | "md";
  showCount?: boolean;
  /** "white" para fundos escuros/gradientes; "default" para fundo claro */
  variant?: "default" | "white";
  className?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ProductRatingDisplay({
  productId,
  size = "sm",
  showCount = true,
  variant = "default",
  className,
}: ProductRatingDisplayProps) {
  const { rating, count } = computeProductRating(productId);

  const sizeMap = {
    xs: { star: "h-2.5 w-2.5", num: "text-[11px]", sub: "text-[10px]" },
    sm: { star: "h-3 w-3",     num: "text-xs",     sub: "text-[10px]" },
    md: { star: "h-3.5 w-3.5", num: "text-sm",     sub: "text-xs"     },
  };

  const s = sizeMap[size];

  // Produto ainda sem nômades habilitados — exibe chip neutro
  if (count === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
          variant === "white"
            ? "bg-white/12 text-white/60 border border-white/15"
            : "bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800/40 dark:text-slate-500",
          s.sub,
          className,
        )}
      >
        Novo
      </span>
    );
  }

  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {/* estrelas */}
      <span className="inline-flex items-center gap-px">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              s.star,
              i < full
                ? variant === "white"
                  ? "fill-amber-300 text-amber-300"
                  : "fill-amber-400 text-amber-400"
                : i === full && half
                ? variant === "white"
                  ? "fill-amber-200 text-amber-300"
                  : "fill-amber-200 text-amber-400"
                : variant === "white"
                ? "fill-white/15 text-white/25"
                : "fill-muted text-muted-foreground/25",
            )}
          />
        ))}
      </span>

      {/* nota numérica */}
      <span
        className={cn(
          "font-bold tabular-nums leading-none",
          variant === "white"
            ? "text-white"
            : "text-slate-800 dark:text-slate-100",
          s.num,
        )}
      >
        {rating.toFixed(1)}
      </span>

      {/* contagem de nômades */}
      {showCount && (
        <span
          className={cn(
            "leading-none",
            variant === "white" ? "text-white/55" : "text-muted-foreground",
            s.sub,
          )}
        >
          ({count})
        </span>
      )}
    </span>
  );
}
