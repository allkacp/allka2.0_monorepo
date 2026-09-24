"use client";

// Linha de tabela (modo Lista) do catálogo do catalog2 — mesmo visual do
// Cadastro de Produtos do admin, agora também usado pela loja do cliente
// (Company/Agency/Leader). Achado do usuário 2026-09-25: a tela de
// referência é a de LISTA (não a de grade) — este é o componente
// compartilhado equivalente ao Catalog2ProductCard, mas pro modo lista.
//
// `showAdminColumns=true` (só admin) inclui as colunas Tarefas e
// Pendências — informação interna, nunca mostrada pro cliente/líder.

import type { ReactNode } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";
import { catalog2CategoryTone, catalog2EditorialImage } from "@/lib/catalog2-editorial";

const COLUMNS_ADMIN =
  "grid-cols-[minmax(300px,2.2fr)_minmax(125px,.75fr)_minmax(100px,.55fr)_minmax(115px,.65fr)_minmax(100px,.55fr)_minmax(130px,.75fr)_minmax(120px,.7fr)_minmax(270px,1.35fr)]";
const COLUMNS_CLIENT =
  "grid-cols-[minmax(300px,2.2fr)_minmax(125px,.75fr)_minmax(100px,.55fr)_minmax(130px,.75fr)_minmax(120px,.7fr)_minmax(270px,1.35fr)]";

export function Catalog2ProductListHeader({ showAdminColumns = false }: { showAdminColumns?: boolean }) {
  return (
    <div
      className={`grid ${showAdminColumns ? COLUMNS_ADMIN : COLUMNS_CLIENT} gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/60`}
    >
      <span>Produto</span>
      <span>Categoria</span>
      {showAdminColumns && <span>Tarefas</span>}
      {showAdminColumns && <span>Pendências</span>}
      <span>Prazo</span>
      <span>Preço</span>
      <span>Status</span>
      <span>Ações</span>
    </div>
  );
}

export interface Catalog2ProductListRowProps {
  name: string;
  description?: string | null;
  categoryName: string;
  taskCount?: ReactNode;
  pendencyBadge?: ReactNode;
  deadlineDays?: number | null;
  price?: number | null;
  priceExtra?: ReactNode;
  statusBadge: ReactNode;
  onOpen: () => void;
  showAdminColumns?: boolean;
  ctaLabel?: string;
}

export function Catalog2ProductListRow({
  name,
  description,
  categoryName,
  taskCount,
  pendencyBadge,
  deadlineDays,
  price,
  priceExtra,
  statusBadge,
  onOpen,
  showAdminColumns = false,
  ctaLabel = "Ver detalhes",
}: Catalog2ProductListRowProps) {
  const rowLabel = `${name} — ver detalhes`;
  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`grid cursor-pointer ${showAdminColumns ? COLUMNS_ADMIN : COLUMNS_CLIENT} items-center gap-3 px-4 py-2.5 transition-colors hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 active:bg-slate-100 dark:hover:bg-slate-800/40 dark:active:bg-slate-800`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Catalog2Thumbnail productId={name} imagePath={catalog2EditorialImage(categoryName, name)} size="sm" showBadge={false} />
        <div className="min-w-0">
          <span title={name} className="block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
            {name}
          </span>
          <p title={description ?? undefined} className="truncate text-[11px] text-slate-500">
            {description || "Produto em preparação"}
          </p>
        </div>
      </div>
      <Badge className={`w-fit border-0 px-2 py-0.5 text-[10px] font-semibold shadow-none ring-1 ${catalog2CategoryTone(categoryName)}`}>
        {categoryName}
      </Badge>
      {showAdminColumns && <span className="text-xs text-slate-600">{taskCount}</span>}
      {showAdminColumns && <span>{pendencyBadge}</span>}
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
        <Clock3 className="h-3.5 w-3.5" />
        {deadlineDays != null ? `${deadlineDays} dia(s)` : "—"}
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-extrabold text-violet-700">
        {price != null ? `R$ ${price.toFixed(2)}` : "—"}
        {priceExtra}
      </span>
      <span>{statusBadge}</span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-9 w-full rounded-lg bg-linear-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-xs font-semibold text-white"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
