"use client";

// Linha de tabela (modo Lista) do catálogo do catalog2 — mesmo visual do
// Cadastro de Produtos do admin, agora também usado pela loja do cliente
// (Company/Agency/Leader). Achado do usuário 2026-09-25: a tela de
// referência é a de LISTA (não a de grade) — este é o componente
// compartilhado equivalente ao Catalog2ProductCard, mas pro modo lista.
//
// `showAdminColumns=true` (só admin) inclui as colunas Tarefas e
// Pendências — informação interna, nunca mostrada pro cliente/líder.
//
// Pedido do usuário 2026-09-25 ("deixar igual à lista de usuários"):
//   - cabeçalho clicável para ordenar (setinha mostra a coluna/sentido);
//   - arrastar a borda de uma coluna para mudar a largura (fica salvo no
//     navegador);
//   - linhas alternando cinza claro / cinza escuro (sem linha branca).
// Ordenar e redimensionar são opcionais: quem não passa as props continua
// com o visual e o comportamento de antes.

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ChevronDown, ChevronUp, ChevronsUpDown, Clock3, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";
import { catalog2CategoryTone, catalog2EditorialImage } from "@/lib/catalog2-editorial";

export type ListColumnKey = "id" | "product" | "category" | "tasks" | "pendencies" | "deadline" | "price" | "status" | "actions";
export type ListSortDir = "asc" | "desc";

const COLUMNS: { key: ListColumnKey; label: string; adminOnly?: boolean; min: number }[] = [
  { key: "id", label: "ID", min: 48 },
  { key: "product", label: "Produto", min: 160 },
  { key: "category", label: "Categoria", min: 80 },
  { key: "tasks", label: "Tarefas", adminOnly: true, min: 70 },
  { key: "pendencies", label: "Pendências", adminOnly: true, min: 90 },
  { key: "deadline", label: "Prazo", min: 70 },
  { key: "price", label: "Preço", min: 80 },
  { key: "status", label: "Status", min: 90 },
  { key: "actions", label: "Ações", min: 100 },
];

// Larguras flexíveis de antes — valem até o usuário arrastar a primeira borda.
const DEFAULT_TEMPLATE_ADMIN =
  "72px minmax(300px,2.2fr) minmax(125px,.75fr) minmax(100px,.55fr) minmax(115px,.65fr) minmax(100px,.55fr) minmax(130px,.75fr) minmax(120px,.7fr) minmax(270px,1.35fr)";
const DEFAULT_TEMPLATE_CLIENT =
  "72px minmax(300px,2.2fr) minmax(125px,.75fr) minmax(100px,.55fr) minmax(130px,.75fr) minmax(120px,.7fr) minmax(270px,1.35fr)";

const GAP_PX = 12; // gap-3
const PADDING_PX = 32; // px-4 dos dois lados

export interface Catalog2ListColumns {
  showAdminColumns: boolean;
  template: string;
  minWidth: number | undefined;
  headerRef: React.RefObject<HTMLDivElement | null>;
  beginResize: (event: React.PointerEvent, key: ListColumnKey) => void;
  moveResize: (event: React.PointerEvent) => void;
  endResize: () => void;
  reset: () => void;
  customized: boolean;
}

export function useCatalog2ListColumns(showAdminColumns: boolean, storageKey: string): Catalog2ListColumns {
  const cols = COLUMNS.filter((c) => showAdminColumns || !c.adminOnly);
  const [widths, setWidths] = useState<Partial<Record<ListColumnKey, number>> | null>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Partial<Record<ListColumnKey, number>>) : null;
    } catch {
      return null;
    }
  });
  const headerRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ key: ListColumnKey; startX: number; startWidth: number } | null>(null);
  const latest = useRef(widths);
  latest.current = widths;

  const persist = (next: Partial<Record<ListColumnKey, number>> | null) => {
    try {
      if (next) window.localStorage.setItem(storageKey, JSON.stringify(next));
      else window.localStorage.removeItem(storageKey);
    } catch {
      /* preferência opcional: sem localStorage, só não fica salva */
    }
  };

  const beginResize = useCallback(
    (event: React.PointerEvent, key: ListColumnKey) => {
      event.preventDefault();
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      let base = latest.current;
      if (!base) {
        // 1º arraste: congela as larguras flexíveis atuais em pixels.
        const cells = Array.from(headerRef.current?.children ?? []) as HTMLElement[];
        base = {};
        cols.forEach((c, i) => {
          base![c.key] = Math.round(cells[i]?.getBoundingClientRect().width ?? c.min);
        });
        setWidths(base);
      }
      drag.current = { key, startX: event.clientX, startWidth: base[key] ?? 120 };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showAdminColumns],
  );

  const moveResize = useCallback((event: React.PointerEvent) => {
    const active = drag.current;
    if (!active) return;
    const min = COLUMNS.find((c) => c.key === active.key)!.min;
    const width = Math.max(min, Math.round(active.startWidth + event.clientX - active.startX));
    setWidths((current) => ({ ...(current ?? {}), [active.key]: width }));
  }, []);

  const endResize = useCallback(() => {
    if (!drag.current) return;
    drag.current = null;
    persist(latest.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    setWidths(null);
    persist(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const template = widths
    ? cols.map((c) => `${widths[c.key] ?? c.min}px`).join(" ")
    : showAdminColumns
      ? DEFAULT_TEMPLATE_ADMIN
      : DEFAULT_TEMPLATE_CLIENT;
  const minWidth = widths
    ? cols.reduce((sum, c) => sum + (widths[c.key] ?? c.min), 0) + GAP_PX * (cols.length - 1) + PADDING_PX
    : undefined;

  return { showAdminColumns, template, minWidth, headerRef, beginResize, moveResize, endResize, reset, customized: !!widths };
}

export interface Catalog2ProductListHeaderProps {
  showAdminColumns?: boolean;
  columns?: Catalog2ListColumns;
  /** Colunas que ordenam ao clicar. */
  sortableKeys?: ListColumnKey[];
  activeSort?: { key: ListColumnKey; dir: ListSortDir } | null;
  onSort?: (key: ListColumnKey) => void;
}

export function Catalog2ProductListHeader({
  showAdminColumns = false,
  columns,
  sortableKeys = [],
  activeSort = null,
  onSort,
}: Catalog2ProductListHeaderProps) {
  const cols = COLUMNS.filter((c) => showAdminColumns || !c.adminOnly);
  const template = columns?.template ?? (showAdminColumns ? DEFAULT_TEMPLATE_ADMIN : DEFAULT_TEMPLATE_CLIENT);
  return (
    <div
      ref={columns?.headerRef}
      style={{ gridTemplateColumns: template }}
      className="grid gap-3 border-b border-slate-200/60 bg-slate-50 px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#365A91] dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400"
    >
      {cols.map((c) => {
        const sortable = !!onSort && sortableKeys.includes(c.key);
        const active = activeSort?.key === c.key;
        return (
          <div key={c.key} className="relative flex min-w-0 items-center justify-center gap-1">
            {sortable ? (
              <button
                type="button"
                onClick={() => onSort!(c.key)}
                title={`Ordenar por ${c.label}`}
                className={`group flex min-w-0 items-center gap-1 uppercase transition-colors hover:text-violet-700 dark:hover:text-violet-300 ${active ? "text-violet-700 dark:text-violet-300" : ""}`}
              >
                <span className="truncate">{c.label}</span>
                {active ? (
                  activeSort!.dir === "desc" ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-400" />
                )}
              </button>
            ) : (
              <span className="truncate">{c.label}</span>
            )}
            <Info className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
            {columns && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={`Redimensionar coluna ${c.label}`}
                onPointerDown={(event) => columns.beginResize(event, c.key)}
                onPointerMove={columns.moveResize}
                onPointerUp={columns.endResize}
                onPointerCancel={columns.endResize}
                className="absolute -right-0.5 top-1/2 z-20 h-7 w-1.5 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-slate-200/90 opacity-70 transition-all hover:w-2 hover:bg-fuchsia-400 hover:opacity-100"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface Catalog2ProductListRowProps {
  /** ID do produto (mesmo número do link /catalogo-produtos/NN). */
  productId?: number | string | null;
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
  /** Mesmas larguras do cabeçalho (vem de useCatalog2ListColumns). */
  gridTemplate?: string;
  /** Alterna cinza claro (false) / cinza escuro (true). Sem a prop, fundo neutro de antes. */
  stripe?: boolean;
}

export function Catalog2ProductListRow({
  productId,
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
  gridTemplate,
  stripe,
}: Catalog2ProductListRowProps) {
  const rowLabel = `${name} — ver detalhes`;
  const template = gridTemplate ?? (showAdminColumns ? DEFAULT_TEMPLATE_ADMIN : DEFAULT_TEMPLATE_CLIENT);
  // Mesma paleta da lista de Usuários (Gestão de Contas): branco / #f5f8fc,
  // hover azulado. Pedido do usuário 2026-09-25: Catálogo de Produtos tem que
  // ser igual a essa lista; só o Cadastro de Produtos usa cinzas mais escuros.
  const zebra =
    stripe === undefined
      ? "hover:bg-violet-50/40"
      : stripe
        ? "bg-[#f5f8fc] hover:bg-[#eaf2ff] dark:bg-[oklch(0.185_0.024_258)] dark:hover:bg-[oklch(0.21_0.024_258)]"
        : "bg-white hover:bg-[#f3f7ff] dark:bg-[oklch(0.14_0.026_258)] dark:hover:bg-[oklch(0.21_0.024_258)]";
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
      style={{ gridTemplateColumns: template }}
      className={`group grid cursor-pointer ${zebra} items-center gap-3 border-b border-slate-100 px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:border-slate-800`}
    >
      <span className="text-center text-sm font-bold text-[#31578F] dark:text-slate-300">
        {productId != null && productId !== "" ? String(productId).padStart(2, "0") : "—"}
      </span>
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
      <Badge className={`w-fit max-w-full truncate border-0 px-2 py-0.5 text-[10px] font-semibold shadow-none ring-1 ${catalog2CategoryTone(categoryName)}`}>
        {categoryName}
      </Badge>
      {showAdminColumns && <span className="min-w-0 truncate text-xs text-slate-600">{taskCount}</span>}
      {showAdminColumns && <span className="min-w-0">{pendencyBadge}</span>}
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
        <Clock3 className="h-3.5 w-3.5" />
        {deadlineDays != null ? `${deadlineDays} dia(s)` : "—"}
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-extrabold text-violet-700">
        {price != null ? `R$ ${price.toFixed(2)}` : "—"}
        {priceExtra}
      </span>
      <span className="min-w-0">{statusBadge}</span>
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
