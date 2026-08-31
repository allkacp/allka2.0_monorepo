"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Peças reaproveitadas entre o modal antigo de detalhe do produto
 * (product-detail-sheet.tsx, usado no modo painel/picker) e a tela cheia de
 * contratação (product-contract-view.tsx). Extraídas para não manter duas
 * implementações divergentes de formatação, FAQ, seção e galeria.
 */

export function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

// Extrai quantidade de plataformas do scopeDescription ("em até X plataformas")
export function parsePlatforms(scope: string | undefined): string | null {
  if (!scope) return null;
  const m = scope.match(/em até (\d+) plataforma/i);
  return m ? m[1] : null;
}

// Extrai quantidade de campanhas do nome da variação ("Até X campanhas")
export function parseCampaigns(name: string): string | null {
  const m = name.match(/[Aa]té (\d+) campanha/i);
  return m ? m[1] : null;
}

// Extrai quantidade de páginas do nome da variação ("Até X páginas")
export function parsePages(name: string): string | null {
  const m = name.match(/[Aa]té (\d+) página/i);
  return m ? m[1] : null;
}

// Retorna o label de prazo público correto (ex: "28 dias úteis") usando
// variationsInternal do produto pai, com fallback para "{n} dias".
export function getDeadlineLabel(
  name: string,
  days: number | undefined,
  variationsInternal: Record<string, any>,
): string | null {
  if (!days) return null;
  const entry = Object.values(variationsInternal || {}).find(
    (v: any) => v.label === name,
  ) as any;
  if (entry?.publicDeadlineLabel) return entry.publicDeadlineLabel;
  return `${days} dias`;
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium">{question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t bg-muted/10">
          <p className="pt-3">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
export function Section({
  icon: Icon,
  title,
  color = "text-blue-600",
  bg = "bg-blue-100 dark:bg-blue-900/40",
  children,
}: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            bg,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", color)} />
        </div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Portfolio Gallery ────────────────────────────────────────────────────────
export function PortfolioGallery({
  images,
  productName,
  coverImage,
}: {
  images: string[];
  productName: string;
  coverImage?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Merge cover image + demonstrations (deduplicated)
  const allImages = Array.from(
    new Set([...(coverImage ? [coverImage] : []), ...images]),
  );

  const hasPrev = activeIdx > 0;
  const hasNext = activeIdx < allImages.length - 1;

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Images className="h-8 w-8 opacity-40" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">
            Nenhuma imagem de portfólio ainda
          </p>
          <p className="text-xs text-slate-400 mt-1">
            As imagens serão adicionadas conforme os trabalhos forem concluídos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Main image ── */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-border/50 shadow-sm group">
        <img
          key={activeIdx}
          src={allImages[activeIdx]}
          alt={`${productName} — portfólio ${activeIdx + 1}`}
          className="w-full object-contain max-h-85 min-h-55"
          style={{
            background: "linear-gradient(135deg,#0f1f5c,#1a2a6f,#7b1850)",
          }}
        />

        {/* Counter badge */}
        <span className="absolute top-3 right-3 text-[11px] font-bold bg-black/50 text-white backdrop-blur-sm rounded-full px-2.5 py-1">
          {activeIdx + 1} / {allImages.length}
        </span>

        {/* Prev / Next navigation — always visible on hover */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={!hasPrev}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-all",
                "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm",
                !hasPrev && "opacity-30 cursor-not-allowed",
              )}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIdx((i) => Math.min(allImages.length - 1, i + 1))
              }
              disabled={!hasNext}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-all",
                "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm",
                !hasNext && "opacity-30 cursor-not-allowed",
              )}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnails ── */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allImages.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all",
                i === activeIdx
                  ? "border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-900"
                  : "border-border/40 hover:border-slate-400 opacity-60 hover:opacity-100",
              )}
            >
              <img
                src={src}
                alt={`Miniatura ${i + 1}`}
                className="w-full h-full object-cover"
                style={{
                  background: "linear-gradient(135deg,#0f1f5c,#1a2a6f)",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Dot navigation ── */}
      {allImages.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {allImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "rounded-full transition-all",
                i === activeIdx
                  ? "w-4 h-1.5 bg-blue-500"
                  : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400",
              )}
              aria-label={`Ir para imagem ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Coming soon note ── */}
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-3 flex items-center gap-3">
        <Images className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Este portfólio será enriquecido com cases e resultados reais conforme
          os trabalhos forem concluídos pela plataforma.
        </p>
      </div>
    </div>
  );
}
