"use client";

// Barra de busca/ordenação/categorias do catálogo do catalog2 — visual
// ÚNICO usado tanto pelo Cadastro de Produtos do admin quanto pela loja do
// cliente (Company/Agency/preview do admin). Achado do usuário 2026-09-25:
// "é a mesma tela, só muda o que aparece em cima" — isto aqui é a parte de
// baixo que também precisa ser a mesma. O que É diferente entre admin e
// cliente (pendências, status de rascunho, filtro "campos provisórios",
// modo lista com coluna de Ações) fica de fora deste componente de
// propósito — é informação interna que o cliente nunca deve ver; cada
// chamador injeta seus próprios controles extras via `extraControls`.

import type { ReactNode } from "react";
import { ArrowUpDown, ChevronDown, Layers, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STANDARD_SHELL_TABLE_CARD_CLASS } from "@/components/standard-page-shell";

export interface Catalog2SortOption {
  key: string;
  label: string;
}

export interface Catalog2CategoryTab {
  id: string;
  label: string;
  count: number;
}

export interface Catalog2BrowseToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortOptions: Catalog2SortOption[];
  sortValue: string;
  onSortChange: (key: string) => void;
  resultCount: number;
  categoryTabs: Catalog2CategoryTab[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  /** Slot antes do seletor de ordenação — ex.: botão "Filtros" do admin. */
  extraControls?: ReactNode;
  /** Slot depois da contagem — ex.: alternador grade/lista do admin. */
  viewModeToggle?: ReactNode;
  /** Linha de badges de filtro ativo, abaixo da barra principal (admin). */
  activeFilterChips?: ReactNode;
}

export function Catalog2BrowseToolbar({
  search,
  onSearchChange,
  sortOptions,
  sortValue,
  onSortChange,
  resultCount,
  categoryTabs,
  activeCategory,
  onCategoryChange,
  extraControls,
  viewModeToggle,
  activeFilterChips,
}: Catalog2BrowseToolbarProps) {
  const activeSort = sortOptions.find((s) => s.key === sortValue) ?? sortOptions[0];

  return (
    <div className={`${STANDARD_SHELL_TABLE_CARD_CLASS} m-0 space-y-3 p-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar produtos…"
            aria-label="Buscar produtos"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 border-slate-200 bg-white pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {extraControls}

        {sortOptions.length > 0 && activeSort && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {activeSort.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((s) => (
                <DropdownMenuItem key={s.key} onClick={() => onSortChange(s.key)}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
          {resultCount} {resultCount === 1 ? "produto" : "produtos"}
        </span>
        {viewModeToggle}
      </div>

      {activeFilterChips}

      {categoryTabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => onCategoryChange(id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeCategory === id
                  ? "text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
              style={activeCategory === id ? { background: "linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%)" } : undefined}
            >
              <Layers className="h-3 w-3" />
              {label}
              <span
                className={`rounded-full px-1 py-0.5 text-[10px] leading-none ${activeCategory === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"}`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
