"use client";

// Card visual ÚNICO do catálogo do catalog2 — mesma imagem, badges, tags,
// preço/prazo e botão "Ver detalhes" em QUALQUER tela que mostre produtos
// do catálogo novo (hoje: Cadastro de Produtos do admin e a loja do
// cliente — Company/Agency/preview do admin, via Catalog2Store). Mudar o
// visual aqui reflete em todas as telas de uma vez — é o motivo de existir
// como componente próprio em vez de cada tela reimplementar o card
// (achado do usuário 2026-09-25: a loja do cliente tinha virado uma lista
// crua, sem nada a ver com o card rico que o admin já tinha).
//
// Só o VISUAL é compartilhado — cada chamador mapeia seus próprios dados
// (o admin tem pendência/provisório, o cliente não) pras props simples
// abaixo, e pode passar badges/tags extras específicas via `extraBadges`/
// `extraTags`.

import type { ReactNode } from "react";
import { ArrowRight, Clock3, Layers, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { catalog2CategoryTone, catalog2EditorialImage } from "@/lib/catalog2-editorial";

export interface Catalog2ProductCardProps {
  name: string;
  description?: string | null;
  categoryName: string;
  taskCount?: ReactNode;
  deadlineDays?: number | null;
  price?: number | null;
  onOpen: () => void;
  compact?: boolean;
  /** Canto superior esquerdo do banner (ex.: selo "Novo"/"Destaque"). */
  cornerBadgeLeft?: ReactNode;
  /** Canto superior direito do banner (ex.: status "Ativo"/"Em preparação"). */
  cornerBadgeRight?: ReactNode;
  /** Tags extras na linha de categoria/tarefas (ex.: "pendências", "provisório"). */
  extraTags?: ReactNode;
  /** Conteúdo extra ao lado do preço (ex.: popover de precificação do admin). */
  priceExtra?: ReactNode;
  ctaLabel?: string;
}

export function Catalog2ProductCard({
  name,
  description,
  categoryName,
  taskCount,
  deadlineDays,
  price,
  onOpen,
  compact = false,
  cornerBadgeLeft,
  cornerBadgeRight,
  extraTags,
  priceExtra,
  ctaLabel = "Ver detalhes",
}: Catalog2ProductCardProps) {
  const cardLabel = `${name} — ver detalhes`;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_38px_rgba(76,29,149,0.17)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
    >
      <div className={`relative shrink-0 overflow-hidden ${compact ? "h-24" : "h-32"}`}>
        <img
          src={catalog2EditorialImage(categoryName, name)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/20 via-transparent to-transparent" />
        {cornerBadgeLeft && <div className="absolute left-2.5 top-2.5">{cornerBadgeLeft}</div>}
        {cornerBadgeRight && <div className="absolute right-2.5 top-2.5">{cornerBadgeRight}</div>}
      </div>

      <CardContent className={`flex flex-1 flex-col ${compact ? "gap-1.5 p-3" : "gap-2 p-3.5"}`}>
        <h3
          title={name}
          className={`${compact ? "line-clamp-1 text-[13px]" : "line-clamp-2 text-[15px]"} font-bold leading-snug text-slate-900 transition-colors group-hover:text-violet-700 dark:text-slate-100`}
        >
          {name}
        </h3>
        {!compact && (
          <p title={description ?? undefined} className="line-clamp-2 text-xs leading-[1.35] text-slate-500 dark:text-slate-400">
            {description || "Descrição ainda não escrita — produto em preparação."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ${catalog2CategoryTone(categoryName)}`}>
            <Layers className="h-3 w-3 shrink-0" /> {categoryName}
          </span>
          {taskCount != null && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              {taskCount}
            </span>
          )}
          {extraTags}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          {deadlineDays != null && (
            <>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-700">
                <Clock3 className="h-4 w-4" /> {deadlineDays} dia(s)
              </span>
              <span className="h-5 w-px bg-slate-200" />
            </>
          )}
          {price != null && (
            <span className="truncate text-lg font-extrabold tracking-tight text-violet-700">
              R$ {price.toFixed(2)}
            </span>
          )}
          {priceExtra}
        </div>
        <div className="grid grid-cols-1 gap-2 pt-1">
          <Button
            size="sm"
            className="h-9 w-full rounded-lg bg-linear-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-xs font-semibold text-white shadow-[0_6px_16px_rgba(123,44,219,0.25)] hover:from-[#3b22d9] hover:to-[#bd177e]"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
