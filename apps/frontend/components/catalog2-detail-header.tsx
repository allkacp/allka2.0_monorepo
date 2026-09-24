"use client";

// Cabeçalho degradê do DETALHE de produto do catalog2 — extraído de
// catalog2-product-detail.tsx (o "Detalhe comercial" do admin, que por sua
// vez reproduz a estrutura visual da tela de produção antiga,
// product-contract-view.tsx). Compartilhado entre o admin (preview
// somente-leitura) e a loja do cliente (configurador real de compra) —
// achado do usuário 2026-09-23: a tela de detalhe do cliente nunca tinha
// ganhado esse visual, só a lista/grade de produtos. Mudar aqui reflete nos
// dois lugares.

import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, Layers, CalendarClock, X } from "lucide-react";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";

export interface Catalog2DetailHeaderProps {
  onBack: () => void;
  breadcrumbLabel?: string;
  productId: string;
  imagePath?: string | null;
  title: string;
  categoryName?: string | null;
  optionsCount?: number;
  optionsAreProvisional?: boolean;
  code?: string | null;
  deadlineDays?: number | null;
  deadlineIsProvisional?: boolean;
  statusLabel?: string | null;
  /** Badges extras entre prazo e status — ex.: modalidade provisória (admin). */
  extraBadges?: ReactNode;
  /** Slot à direita — preço + CTA (cada chamador decide o que faz sentido). */
  rightSlot?: ReactNode;
}

export function Catalog2DetailHeader({
  onBack,
  breadcrumbLabel = "Catálogo de Produtos",
  productId,
  imagePath,
  title,
  categoryName,
  optionsCount,
  optionsAreProvisional,
  code,
  deadlineDays,
  deadlineIsProvisional,
  statusLabel,
  extraBadges,
  rightSlot,
}: Catalog2DetailHeaderProps) {
  return (
    <div className="shrink-0 relative overflow-hidden mb-2 rounded-xl shadow-[0_4px_18px_-5px_rgba(0,0,0,0.15)]">
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }} />
      {/* Fechar — canto superior direito, padrão pedido pelo usuário
          2026-09-23 pra toda tela de detalhe (além do "voltar" no
          breadcrumb, que ficava pouco visível). Mesma ação (fecha o
          detalhe e volta pro catálogo) — não há distinção real entre
          "fechar" e "voltar" aqui, é uma tela só, não uma pilha. */}
      <button
        type="button"
        onClick={onBack}
        aria-label="Fechar"
        title="Fechar"
        className="absolute right-2.5 top-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="relative z-10 px-3 py-3 sm:px-4 sm:py-3.5 flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-white/65">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar ao catálogo"
              title="Voltar ao catálogo"
              className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <span>{breadcrumbLabel}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-white/85">{title}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Catalog2Thumbnail productId={productId} imagePath={imagePath ?? null} size="sm" showBadge={false} />
            <div className="min-w-0">
              <h1 title={title} className="truncate text-lg sm:text-xl font-bold leading-tight text-white">
                {title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {categoryName && (
                  <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-[2px] rounded-full bg-white/15 border border-white/25 text-white uppercase tracking-wider">
                    {categoryName}
                  </span>
                )}
                {optionsCount != null && optionsCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-[2px] rounded-full bg-white/12 border border-white/20 text-white/90">
                    <Layers className="h-2.5 w-2.5" />
                    {optionsCount} {optionsCount === 1 ? "opção" : "opções"}
                    {optionsAreProvisional && <span className="ml-1 opacity-80">(provisórias)</span>}
                  </span>
                )}
                {code && (
                  <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-[2px] rounded-md bg-white/10 border border-white/20 text-white/80 tracking-widest">
                    {code}
                  </span>
                )}
                {deadlineDays != null && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-[2px] rounded-full bg-white/12 border border-white/20 text-white/90">
                    <CalendarClock className="h-2.5 w-2.5" />
                    {deadlineDays} dias {deadlineIsProvisional && <span className="opacity-70">(provisório)</span>}
                  </span>
                )}
                {extraBadges}
                {statusLabel && (
                  <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-[2px] rounded-full bg-white/12 border border-white/20 text-white/90 uppercase">
                    {statusLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {rightSlot && (
          <div className="flex shrink-0 items-center gap-2 xl:border-l xl:border-white/15 xl:pl-4">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}
