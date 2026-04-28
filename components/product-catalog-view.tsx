// @ts-nocheck
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProducts, type Product } from "@/lib/contexts/product-context";
import {
  Search,
  ShoppingCart,
  Clock,
  Palette,
  Code,
  TrendingUp,
  Megaphone,
  Video,
  FileText,
  Package,
  Check,
  Minus,
  Plus,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Zap,
  Globe,
  X,
  Filter,
  Pencil,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductDetailSheet } from "@/components/product-detail-sheet";
import { ProductRatingDisplay } from "@/components/product-rating-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/contexts/sidebar-context";
import { computeProductRating } from "@/dev-mocks/data/product-nomads";

export type CatalogMode = "page" | "panel";

export interface CatalogSelectedProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  finalPrice: number;
  image?: string;
  quantity: number;
  customizations?: Record<string, any>;
  [key: string]: any;
}

interface ProductCatalogViewProps {
  mode?: CatalogMode;
  selectedProducts?: CatalogSelectedProduct[];
  productQuantities?: Record<string, number>;
  onAdd?: (product: Product) => void;
  onRemove?: (productId: string) => void;
  onIncrease?: (productId: string) => void;
  onDecrease?: (productId: string) => void;
  /** Called when user clicks "Ver Carrinho" sticky footer (panel mode only) */
  onConfirm?: () => void;
  /** Show a different title in panel mode */
  panelTitle?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  "Mídias e Conteúdo": Megaphone,
  "Design e Criação": Palette,
  "Design e Audiovisual": Palette,
  "Design Gráfico": Palette,
  Design: Palette,
  Desenvolvimento: Code,
  "Desenvolvimento Web": Code,
  Web: Globe,
  Marketing: TrendingUp,
  "Marketing Digital": TrendingUp,
  "Performance e Anúncios Patrocinados": TrendingUp,
  Conteúdo: FileText,
  Vídeo: Video,
  Audiovisual: Video,
  "Social Media": Megaphone,
  "Tráfego Pago": TrendingUp,
  Tráfego: TrendingUp,
  Branding: Palette,
  Automação: Zap,
  SEO: Search,
};

// ── Layout modes ──────────────────────────────────────────
type GridMode = 2 | 3 | 4 | 5 | "list";

// SVG icons that accurately represent each column count
function Grid2Icon({ active }: { active: boolean }) {
  const c = active ? "#1e3a8a" : "#94a3b8";
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <rect x="1" y="1" width="6" height="6" rx="1" fill={c} />
      <rect x="9" y="1" width="6" height="6" rx="1" fill={c} />
      <rect x="1" y="9" width="6" height="6" rx="1" fill={c} />
      <rect x="9" y="9" width="6" height="6" rx="1" fill={c} />
    </svg>
  );
}
function Grid3Icon({ active }: { active: boolean }) {
  const c = active ? "#1e3a8a" : "#94a3b8";
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <rect x="1" y="1" width="4" height="4" rx="0.8" fill={c} />
      <rect x="6" y="1" width="4" height="4" rx="0.8" fill={c} />
      <rect x="11" y="1" width="4" height="4" rx="0.8" fill={c} />
      <rect x="1" y="7" width="4" height="4" rx="0.8" fill={c} />
      <rect x="6" y="7" width="4" height="4" rx="0.8" fill={c} />
      <rect x="11" y="7" width="4" height="4" rx="0.8" fill={c} />
      <rect x="1" y="13" width="4" height="1.5" rx="0.5" fill={c} opacity="0.4" />
      <rect x="6" y="13" width="4" height="1.5" rx="0.5" fill={c} opacity="0.4" />
      <rect x="11" y="13" width="4" height="1.5" rx="0.5" fill={c} opacity="0.4" />
    </svg>
  );
}
function Grid4Icon({ active }: { active: boolean }) {
  const c = active ? "#1e3a8a" : "#94a3b8";
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <rect x="0.5" y="1" width="3" height="3" rx="0.6" fill={c} />
      <rect x="4.5" y="1" width="3" height="3" rx="0.6" fill={c} />
      <rect x="8.5" y="1" width="3" height="3" rx="0.6" fill={c} />
      <rect x="12.5" y="1" width="3" height="3" rx="0.6" fill={c} />
      <rect x="0.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
      <rect x="4.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
      <rect x="8.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
      <rect x="12.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
      <rect x="0.5" y="10" width="3" height="3" rx="0.6" fill={c} />
      <rect x="4.5" y="10" width="3" height="3" rx="0.6" fill={c} />
      <rect x="8.5" y="10" width="3" height="3" rx="0.6" fill={c} />
      <rect x="12.5" y="10" width="3" height="3" rx="0.6" fill={c} />
    </svg>
  );
}
function Grid5Icon({ active }: { active: boolean }) {
  const c = active ? "#1e3a8a" : "#94a3b8";
  const xs = [0.5, 3.5, 6.5, 9.5, 12.5];
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      {xs.map((x) => (
        <rect key={x + "a"} x={x} y="1" width="2.3" height="3" rx="0.5" fill={c} />
      ))}
      {xs.map((x) => (
        <rect key={x + "b"} x={x} y="5.5" width="2.3" height="3" rx="0.5" fill={c} />
      ))}
      {xs.map((x) => (
        <rect key={x + "c"} x={x} y="10" width="2.3" height="3" rx="0.5" fill={c} />
      ))}
    </svg>
  );
}
function ListIcon({ active }: { active: boolean }) {
  const c = active ? "#1e3a8a" : "#94a3b8";
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <rect x="1" y="1.5" width="14" height="3" rx="0.8" fill={c} />
      <rect x="1" y="6.5" width="14" height="3" rx="0.8" fill={c} />
      <rect x="1" y="11.5" width="14" height="3" rx="0.8" fill={c} />
    </svg>
  );
}

const GRID_MODES: { value: GridMode; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { value: 2,      label: "2 colunas",  Icon: Grid2Icon },
  { value: 3,      label: "3 colunas",  Icon: Grid3Icon },
  { value: 4,      label: "4 colunas",  Icon: Grid4Icon },
  { value: 5,      label: "5 colunas",  Icon: Grid5Icon },
  { value: "list", label: "Lista",      Icon: ListIcon  },
];

const SORT_OPTIONS = [
  { value: "smart",           label: "Mais relevantes" },
  { value: "deliveries_desc", label: "Mais vendidos" },
  { value: "rating_desc",     label: "Melhor avaliados" },
  { value: "price_asc",       label: "Menor preço" },
  { value: "price_desc",      label: "Maior preço" },
  { value: "name_asc",        label: "Nome (A-Z)" },
  { value: "name_desc",       label: "Nome (Z-A)" },
];

const RECURRENCE_OPTIONS = [
  { value: "all",     label: "Todos os tipos" },
  { value: "Mensal",  label: "Mensal" },
  { value: "Avulso",  label: "Avulso / Único" },
];

const VARIATIONS_OPTIONS = [
  { value: "all",  label: "Qualquer" },
  { value: "yes",  label: "Com variações" },
  { value: "no",   label: "Sem variações" },
];

function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ProductCatalogView({
  mode = "page",
  selectedProducts = [],
  productQuantities = {},
  onAdd,
  onRemove,
  onIncrease,
  onDecrease,
  onConfirm,
  panelTitle = "Selecionar Produtos",
}: ProductCatalogViewProps) {
  const { products } = useProducts();

  const { sidebarWidth } = useSidebar();
  const headerHeight = 64;
  const footerHeight = 40;

  const [search, setSearch] = useState("");
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [sort, setSort] = useState("smart");
  const [recurrenceFilter, setRecurrenceFilter] = useState("all");
  const [variationsFilter, setVariationsFilter] = useState("all");
  const [gridMode, setGridMode] = useState<GridMode>(mode === "panel" ? 3 : 4);

  // ── Advanced filter modal state ──────────────────────────────────────────
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<Array<{ id: string; name: string; filters: any }>>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [visibleFields, setVisibleFields] = useState([
    "categoria",
    "recorrencia",
    "variacoes",
    "ordenar",
  ]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products],
  );

  const allCategories = useMemo(
    () => Array.from(new Set(activeProducts.map((p) => p.category))),
    [activeProducts],
  );

  const categoryTabs = useMemo(
    () => [
      { id: "Todos", label: "Todos", count: activeProducts.length },
      ...allCategories.map((cat) => ({
        id: cat,
        label: cat,
        count: activeProducts.filter((p) => p.category === cat).length,
      })),
    ],
    [activeProducts, allCategories],
  );

  // All distinct recurrence values in active products
  const allRecurrences = useMemo(
    () => Array.from(new Set(activeProducts.map((p) => (p as any).recurrence).filter(Boolean))),
    [activeProducts],
  );

  const filteredProducts = useMemo(() => {
    let list = activeProducts.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        ((p as any).tags || []).some((t: string) =>
          t.toLowerCase().includes(search.toLowerCase()),
        );
      const matchesCategory = category === "Todos" || p.category === category;
      const matchesRecurrence =
        recurrenceFilter === "all" || (p as any).recurrence === recurrenceFilter;
      const hasVariations = (p.variations || []).filter((v: any) => v.isActive !== false).length > 0;
      const matchesVariations =
        variationsFilter === "all" ||
        (variationsFilter === "yes" && hasVariations) ||
        (variationsFilter === "no" && !hasVariations);
      return matchesSearch && matchesCategory && matchesRecurrence && matchesVariations;
    });

    // Precomputa ratings uma vez para evitar chamadas repetidas no comparador
    const ratingsCache = {};
    const getRating = (id) => {
      if (!ratingsCache[id]) ratingsCache[id] = computeProductRating(id);
      return ratingsCache[id];
    };

    list = [...list].sort((a, b) => {
      if (sort === "smart") {
        const ra = getRating(a.id), rb = getRating(b.id);
        if (rb.totalDeliveries !== ra.totalDeliveries) return rb.totalDeliveries - ra.totalDeliveries;
        if (rb.rating !== ra.rating) return rb.rating - ra.rating;
        return a.name.localeCompare(b.name);
      }
      if (sort === "deliveries_desc") {
        const ra = getRating(a.id), rb = getRating(b.id);
        if (rb.totalDeliveries !== ra.totalDeliveries) return rb.totalDeliveries - ra.totalDeliveries;
        if (rb.rating !== ra.rating) return rb.rating - ra.rating;
        return a.name.localeCompare(b.name);
      }
      if (sort === "rating_desc") {
        const ra = getRating(a.id), rb = getRating(b.id);
        if (rb.rating !== ra.rating) return rb.rating - ra.rating;
        return rb.totalDeliveries - ra.totalDeliveries || a.name.localeCompare(b.name);
      }
      if (sort === "name_asc")   return a.name.localeCompare(b.name);
      if (sort === "name_desc")  return b.name.localeCompare(a.name);
      if (sort === "price_asc")  return (a.finalPrice || 0) - (b.finalPrice || 0);
      if (sort === "price_desc") return (b.finalPrice || 0) - (a.finalPrice || 0);
      return 0;
    });

    return list;
  }, [activeProducts, search, category, sort, recurrenceFilter, variationsFilter]);

  const hasActiveFilters = recurrenceFilter !== "all" || variationsFilter !== "all" || search || category !== "Todos" || sort !== "smart";

  const activeAdvancedFiltersCount = [
    recurrenceFilter !== "all",
    variationsFilter !== "all",
    category !== "Todos",
    sort !== "smart",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setRecurrenceFilter("all");
    setVariationsFilter("all");
    setCategory("Todos");
    setSort("smart");
  };

  const totalSelected = selectedProducts.reduce((sum, p) => {
    const qty = productQuantities[p.id] || p.quantity || 1;
    return sum + (p.finalPrice || 0) * qty;
  }, 0);

  const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || Package;

  const isSelected = (productId: string) =>
    !!selectedProducts.find((p) => p.id === productId);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Ordenar";

  const currentRecurrenceLabel =
    RECURRENCE_OPTIONS.find((o) => o.value === recurrenceFilter)?.label ?? "Tipo";

  const currentVariationsLabel =
    VARIATIONS_OPTIONS.find((o) => o.value === variationsFilter)?.label ?? "Variações";

  // Grid CSS class helper
  const gridClass = useMemo(() => {
    if (gridMode === "list") return "";
    if (gridMode === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
    if (gridMode === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    if (gridMode === 4) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
    if (gridMode === 5) return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
  }, [gridMode]);

  return (
    <div className={cn("flex flex-col h-full", mode === "page" && "min-h-0")}>
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 space-y-3 border-b border-slate-100 bg-white/80 backdrop-blur-sm",
          mode === "page" ? "px-6 py-4" : "px-4 py-3",
        )}
      >
        {/* Row 1: search + sort + grid modes */}
        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar produtos, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white border-slate-200 focus:border-blue-400 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shrink-0"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentSortLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => setSort(o.value)}
                  className={cn(
                    "text-sm cursor-pointer",
                    sort === o.value && "font-medium text-blue-600",
                  )}
                >
                  {sort === o.value && <Check className="h-3.5 w-3.5 mr-2" />}
                  {sort !== o.value && <span className="w-5 mr-0.5 inline-block" />}
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced Filters button */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-2 px-3.5 text-xs flex-shrink-0",
              activeAdvancedFiltersCount > 0
                ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeAdvancedFiltersCount > 0 && (
              <span className="ml-0.5 flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {activeAdvancedFiltersCount}
              </span>
            )}
          </Button>

          {/* Grid / list mode selector */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0">
            {GRID_MODES.map(({ value, label, Icon }) => (
              <button
                key={String(value)}
                type="button"
                title={label}
                onClick={() => setGridMode(value)}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-md transition-all",
                  gridMode === value
                    ? "bg-white shadow-sm"
                    : "hover:bg-white/60",
                )}
              >
                <Icon active={gridMode === value} />
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Quick chips — atalhos rápidos de ordenação e filtro */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { id: "most_sold",    label: "Mais vendidos",    Icon: TrendingUp,        isActive: sort === "deliveries_desc",         onClick: () => setSort(sort === "deliveries_desc" ? "smart" : "deliveries_desc"),                colorActive: "bg-emerald-500 border-emerald-500 text-white" },
            { id: "top_rated",    label: "Melhor avaliados", Icon: Sparkles,          isActive: sort === "rating_desc",             onClick: () => setSort(sort === "rating_desc" ? "smart" : "rating_desc"),                        colorActive: "bg-amber-400 border-amber-400 text-white" },
            { id: "price_low",    label: "Menor preço",      Icon: ArrowDown,         isActive: sort === "price_asc",               onClick: () => setSort(sort === "price_asc" ? "smart" : "price_asc"),                           colorActive: "bg-slate-700 border-slate-700 text-white" },
            { id: "price_high",   label: "Maior preço",      Icon: ArrowUp,           isActive: sort === "price_desc",              onClick: () => setSort(sort === "price_desc" ? "smart" : "price_desc"),                         colorActive: "bg-slate-700 border-slate-700 text-white" },
            { id: "sep",          label: null,               Icon: null,              isActive: false,                              onClick: null,                                                                                  colorActive: "" },
            { id: "avulso",       label: "Avulso",            Icon: Zap,               isActive: recurrenceFilter === "Avulso",      onClick: () => setRecurrenceFilter(recurrenceFilter === "Avulso" ? "all" : "Avulso"),            colorActive: "bg-blue-500 border-blue-500 text-white" },
            { id: "mensal",       label: "Mensal",            Icon: RotateCcw,         isActive: recurrenceFilter === "Mensal",      onClick: () => setRecurrenceFilter(recurrenceFilter === "Mensal" ? "all" : "Mensal"),            colorActive: "bg-blue-500 border-blue-500 text-white" },
            { id: "with_vars",    label: "Com mais opções",  Icon: SlidersHorizontal, isActive: variationsFilter === "yes",         onClick: () => setVariationsFilter(variationsFilter === "yes" ? "all" : "yes"),                  colorActive: "bg-violet-500 border-violet-500 text-white" },
          ].map(({ id, label, Icon, isActive, onClick, colorActive }) => {
            if (id === "sep") return <span key="sep" className="text-slate-200 select-none hidden sm:inline">|</span>;
            return (
              <button
                key={id}
                type="button"
                onClick={onClick}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                  isActive
                    ? colorActive
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700",
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
          {(sort !== "smart" || recurrenceFilter !== "all" || variationsFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSort("smart"); setRecurrenceFilter("all"); setVariationsFilter("all"); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" /> Redefinir
            </button>
          )}
        </div>

        {/* Row 3: category pills + secondary filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Category pills */}
          {categoryTabs.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                category === id
                  ? "text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600",
              )}
              style={
                category === id
                  ? {
                      background:
                        "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
                    }
                  : undefined
              }
            >
              {label}
              <span
                className={cn(
                  "text-[10px] leading-none rounded-full px-1 py-0.5",
                  category === id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {count}
              </span>
            </button>
          ))}

          {/* Divider */}
          <span className="text-slate-200 select-none hidden sm:inline">|</span>

          {/* Recurrence filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 gap-1 text-xs border-slate-200 bg-white hover:bg-slate-50 shrink-0 rounded-full px-3",
                  recurrenceFilter !== "all" && "border-blue-300 text-blue-700 bg-blue-50",
                )}
              >
                <span className="hidden sm:inline">{currentRecurrenceLabel}</span>
                <span className="sm:hidden">Tipo</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {RECURRENCE_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => setRecurrenceFilter(o.value)}
                  className={cn(
                    "text-sm cursor-pointer",
                    recurrenceFilter === o.value && "font-medium text-blue-600",
                  )}
                >
                  {recurrenceFilter === o.value && <Check className="h-3.5 w-3.5 mr-2" />}
                  {recurrenceFilter !== o.value && <span className="w-5 mr-0.5 inline-block" />}
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Variations filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 gap-1 text-xs border-slate-200 bg-white hover:bg-slate-50 shrink-0 rounded-full px-3",
                  variationsFilter !== "all" && "border-violet-300 text-violet-700 bg-violet-50",
                )}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span className="hidden sm:inline">{currentVariationsLabel}</span>
                <span className="sm:hidden">Var.</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {VARIATIONS_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => setVariationsFilter(o.value)}
                  className={cn(
                    "text-sm cursor-pointer",
                    variationsFilter === o.value && "font-medium text-violet-600",
                  )}
                >
                  {variationsFilter === o.value && <Check className="h-3.5 w-3.5 mr-2" />}
                  {variationsFilter !== o.value && <span className="w-5 mr-0.5 inline-block" />}
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs text-slate-500 hover:text-red-500 border border-dashed border-slate-300 hover:border-red-300 bg-transparent transition-colors"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Row 3: results count */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
          <span>
            {filteredProducts.length === activeProducts.length
              ? `${activeProducts.length} produto${activeProducts.length !== 1 ? "s" : ""}`
              : `${filteredProducts.length} de ${activeProducts.length} produto${activeProducts.length !== 1 ? "s" : ""}`}
          </span>
          {filteredProducts.length > 0 && (
            <span className="hidden sm:inline opacity-60">
              Modo: {GRID_MODES.find((m) => m.value === gridMode)?.label}
            </span>
          )}
        </div>
      </div>

      {/* ── Products ────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 overflow-y-auto min-h-0",
          mode === "page" ? "px-6 pb-6 pt-4" : "px-4 pb-4 pt-3",
        )}
      >
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-xs mt-1 opacity-70">Tente ajustar os filtros</p>
          </div>
        ) : gridMode === "list" ? (
          /* ── LIST MODE ──────────────────────────────────────── */
          <div className="flex flex-col gap-2">
            {filteredProducts.map((product) => {
              const selected = isSelected(product.id);
              const qty = productQuantities[product.id] || 1;
              const CategoryIcon = getCategoryIcon(product.category);
              const activeVariations = (product.variations || []).filter(
                (v: any) => v.isActive !== false,
              );
              const minVariationPrice =
                activeVariations.length > 0
                  ? Math.min(...activeVariations.map((v: any) => v.price || 0))
                  : null;
              const displayPrice =
                minVariationPrice !== null ? minVariationPrice : product.finalPrice || 0;
              const lineTotal = displayPrice * (selected ? qty : 1);
              const productImage = product.image || (product as any).productImagePreview || null;

              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-4 bg-white border rounded-xl px-4 py-3 transition-all group",
                    selected
                      ? "ring-2 ring-emerald-500 border-emerald-200 shadow-emerald-100/50"
                      : "border-slate-200/70 hover:border-slate-300 hover:shadow-md",
                  )}
                >
                  {/* Thumb */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-linear-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                    {productImage ? (
                      <img src={productImage} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon className="h-6 w-6 text-blue-400" />
                    )}
                    {selected && (
                      <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {product.name}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="shrink-0 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 leading-none tracking-widest self-center cursor-default">
                            {product.id}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">Código único do produto na plataforma</TooltipContent>
                      </Tooltip>
                      {(product as any).recurrence && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 cursor-default",
                              (product as any).recurrence === "Mensal"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-slate-50 text-slate-600 border-slate-200",
                            )}>
                              {(product as any).recurrence}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {(product as any).recurrence === "Mensal"
                              ? "Contratação mensal — renova automaticamente a cada 30 dias"
                              : "Contratação avulsa — você tem 90 dias para solicitar a execução"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CategoryIcon className="h-3 w-3 shrink-0 text-slate-400" />
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {(product as any).summaryDescription || product.description}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 cursor-default">
                          <span className="font-medium text-slate-500">{product.category}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">Categoria do produto</TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-3 mt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            <ProductRatingDisplay productId={product.id} size="xs" showCount={false} variant="default" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Avaliação média ponderada pelos nômades ativos habilitados</TooltipContent>
                      </Tooltip>
                      {activeVariations.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 font-medium cursor-default">
                              <SlidersHorizontal className="h-3 w-3" />
                              {activeVariations.length} {activeVariations.length === 1 ? "opção" : "opções"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Este produto possui variações — veja as opções em "Detalhes"</TooltipContent>
                        </Tooltip>
                      )}
                      {(product as any).deliveryDays && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 cursor-default">
                              <Clock className="h-3 w-3" />
                              {(product as any).deliveryDays} dias
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Prazo estimado de entrega após solicitação</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Price + actions */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <p className="text-base font-bold" style={{ color: "var(--app-brand-active, #3b82f6)" }}>
                      {formatCurrency(lineTotal)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 bg-transparent"
                        onClick={() => { setDetailProduct(product); setDetailOpen(true); }}
                      >
                        Detalhes
                      </Button>
                      {selected ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => onDecrease?.(product.id)}
                            className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-500 transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{qty}</span>
                          <button type="button" onClick={() => onIncrease?.(product.id)}
                            className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 text-slate-500 hover:text-blue-500 transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => onRemove?.(product.id)}
                            className="h-7 w-7 rounded border border-red-200 flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : activeVariations.length > 0 ? (
                        <Button size="sm" className="h-7 px-3 text-xs font-semibold text-white border-0"
                          style={{ background: "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))" }}
                          onClick={() => { setDetailProduct(product); setDetailOpen(true); }}>
                          Escolher
                        </Button>
                      ) : (
                        <Button size="sm" className="h-7 px-3 text-xs font-semibold text-white border-0"
                          style={{ background: "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))" }}
                          onClick={() => onAdd?.(product)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── GRID MODE (2 / 3 / 4 / 5 columns) ─────────────── */
          <div className={gridClass}>
            {filteredProducts.map((product) => {
              const selected = isSelected(product.id);
              const qty = productQuantities[product.id] || 1;
              const CategoryIcon = getCategoryIcon(product.category);
              const activeVariations = (product.variations || []).filter(
                (v: any) => v.isActive !== false,
              );
              const minVariationPrice =
                activeVariations.length > 0
                  ? Math.min(...activeVariations.map((v: any) => v.price || 0))
                  : null;
              const displayPrice =
                minVariationPrice !== null
                  ? minVariationPrice
                  : product.finalPrice || 0;
              const lineTotal = displayPrice * (selected ? qty : 1);
              const productImage =
                product.image || (product as any).productImagePreview || null;
              const isCompact = gridMode === 4 || gridMode === 5;

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "border border-slate-200/70 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group bg-white flex flex-col overflow-hidden cursor-default",
                    selected
                      ? "ring-2 ring-emerald-500 border-emerald-200 shadow-emerald-100/80"
                      : "hover:border-slate-300",
                  )}
                >
                  {/* Image / Icon banner */}
                  <div className={cn("relative overflow-hidden shrink-0 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900", isCompact ? "h-36" : "h-48")}>
                    {productImage ? (
                      <>
                        <img
                          src={productImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-blue-50 via-purple-50 to-pink-50">
                        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm group-hover:scale-105 transition-transform duration-300">
                          <CategoryIcon className={cn("text-blue-500", isCompact ? "h-8 w-8" : "h-12 w-12")} />
                        </div>
                      </div>
                    )}

                    {(product as any).recurrence && (product as any).recurrence !== "" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(
                            "absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 cursor-default",
                            productImage
                              ? "bg-white/20 backdrop-blur-md border border-white/30 text-white"
                              : (product as any).recurrence === "Mensal"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200",
                          )}>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
                            {(product as any).recurrence}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {(product as any).recurrence === "Mensal"
                            ? "Contratação mensal — renova automaticamente a cada 30 dias"
                            : "Contratação avulsa — você tem 90 dias para solicitar a execução"}
                        </TooltipContent>
                      </Tooltip>
                    )}



                    {selected && (
                      <div className="absolute bottom-2.5 right-2.5 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  <CardContent className={cn("flex flex-col flex-1 gap-2.5", isCompact ? "p-3" : "p-4 gap-3")}>
                    {/* Name + description */}
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className={cn("font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors flex-1", isCompact ? "text-sm" : "text-base")}>
                          {product.name}
                        </h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 leading-none tracking-widest cursor-default">
                              {product.id}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Código único do produto na plataforma</TooltipContent>
                        </Tooltip>
                      </div>
                      {!isCompact && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {(product as any).summaryDescription || product.description}
                        </p>
                      )}
                    </div>

                    {/* Category — metadata line */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 cursor-default">
                          <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium truncate">{product.category}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">Categoria do produto</TooltipContent>
                    </Tooltip>

                    {/* Billing type + delivery */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(product as any).recurrence && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border cursor-default",
                                (product as any).recurrence === "Mensal"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200",
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 inline-block shrink-0" />
                              {(product as any).recurrence}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {(product as any).recurrence === "Mensal"
                              ? "Contratação mensal — renova automaticamente a cada 30 dias"
                              : "Contratação avulsa — você tem 90 dias para solicitar a execução"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!isCompact && (product as any).deliveryDays && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1 cursor-default">
                              <Clock className="h-3 w-3" />
                              {(product as any).deliveryDays} dias
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Prazo estimado de entrega após solicitação</TooltipContent>
                        </Tooltip>
                      )}
                      {!isCompact && (product as any).tags?.slice(0, 1).map((tag: string) => (
                        <Tooltip key={tag}>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-violet-50 text-violet-600 font-medium border border-violet-100 cursor-default"
                            >
                              {tag}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Tag de identificação do produto</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            <ProductRatingDisplay
                              productId={product.id}
                              size="sm"
                              showCount={!isCompact}
                              variant="default"
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Avaliação média ponderada pelos nômades ativos habilitados</TooltipContent>
                      </Tooltip>
                      {product.variations?.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold cursor-default">
                              <SlidersHorizontal className="h-3 w-3" />
                              {product.variations.length}{" "}
                              {!isCompact && (product.variations.length === 1 ? "opção" : "opções")}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Este produto possui variações — veja as opções em "Ver detalhes"</TooltipContent>
                        </Tooltip>
                      )}
                      {!isCompact && product.addOns?.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-0.5 text-purple-400 cursor-default">
                              <Sparkles className="h-3 w-3" />
                              <span>{product.addOns.length} add-ons</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Complementos disponíveis para adicionar a este produto</TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mt-auto pt-2.5 border-t border-slate-100">
                      {!isCompact && (
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                          {activeVariations.length > 0 || (product as any).recurrence === "Mensal"
                            ? "A partir de / mês"
                            : "A partir de"}
                        </p>
                      )}
                      <p
                        className={cn("font-bold", isCompact ? "text-base" : "text-xl")}
                        style={{ color: "var(--app-brand-active, #3b82f6)" }}
                      >
                        {formatCurrency(lineTotal)}
                      </p>

                      {/* Actions */}
                      <div className={cn("space-y-1.5", isCompact ? "mt-2" : "mt-3")}>
                        {!isCompact && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50 bg-transparent"
                            onClick={() => {
                              setDetailProduct(product);
                              setDetailOpen(true);
                            }}
                          >
                            Ver detalhes
                          </Button>
                        )}

                        {selected ? (
                          <>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onDecrease?.(product.id)}
                                className="flex-1 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-500 transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-slate-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => onIncrease?.(product.id)}
                                className="flex-1 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-500 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 bg-transparent"
                              onClick={() => onRemove?.(product.id)}
                            >
                              Remover
                            </Button>
                          </>
                        ) : activeVariations.length > 0 ? (
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs font-semibold text-white shadow-sm border-0"
                            style={{
                              background:
                                "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
                            }}
                            onClick={() => {
                              setDetailProduct(product);
                              setDetailOpen(true);
                            }}
                          >
                            <SlidersHorizontal className="h-3 w-3 mr-1" />
                            {isCompact ? "Escolher" : "Escolher opção"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs font-semibold text-white shadow-sm border-0"
                            style={{
                              background:
                                "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
                            }}
                            onClick={() => onAdd?.(product)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {isCompact ? "Adicionar" : "Adicionar à cesta"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky footer (panel mode only) ─────────────────── */}
      {/* Detail sheet */}
      <ProductDetailSheet
        product={detailProduct}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAdd={onAdd}
        isSelected={detailProduct ? isSelected(detailProduct.id) : false}
      />

      {/* ── Advanced Filters Modal ───────────────────────────── */}
      {isFilterModalOpen && (() => {
        const allFilterFields = [
          { id: "categoria",   label: "Categoria",    section: "produto" },
          { id: "recorrencia", label: "Recorrência",  section: "produto" },
          { id: "variacoes",   label: "Variações",    section: "produto" },
          { id: "ordenar",     label: "Ordenar por",  section: "produto" },
        ];
        const has = (id: string) => visibleFields.includes(id);
        const handleDrop = (targetId: string) => {
          if (!draggingFilterId || draggingFilterId === targetId) return;
          const from = savedFilters.findIndex((f) => f.id === draggingFilterId);
          const to   = savedFilters.findIndex((f) => f.id === targetId);
          if (from === -1 || to === -1) return;
          const reordered = [...savedFilters];
          const [moved] = reordered.splice(from, 1);
          reordered.splice(to, 0, moved);
          setSavedFilters(reordered);
          setDraggingFilterId(null);
          setDragOverFilterId(null);
        };
        const clearAdvancedFilters = () => {
          setCategory("Todos");
          setRecurrenceFilter("all");
          setVariationsFilter("all");
          setSort("name_asc");
        };
        const applyAndClose = () => {
          setIsFilterModalOpen(false);
          setShowFieldPicker(false);
        };
        return (
          <div
            className="fixed z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
            style={{
              left: sidebarWidth,
              top: headerHeight,
              bottom: footerHeight,
              right: 0,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsFilterModalOpen(false);
                setSelectedFilterId(null);
                setShowFieldPicker(false);
              }
            }}
          >
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">

              {/* Header */}
              <ModalBrandHeader
                title="Filtros Avançados"
                subtitle="Configure e aplique filtros no catálogo"
                icon={<Filter />}
                onClose={() => {
                  setIsFilterModalOpen(false);
                  setSelectedFilterId(null);
                  setShowFieldPicker(false);
                }}
              />

              {/* Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Left — Saved Filters */}
                <div className="w-44 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1 flex-shrink-0">
                    <Filter className="h-3 w-3" /> Filtros Salvos
                  </p>
                  <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                    {savedFilters.length === 0 ? (
                      <div className="text-center py-8">
                        <Filter className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Nenhum filtro salvo</p>
                      </div>
                    ) : (
                      savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          draggable
                          onDragStart={() => setDraggingFilterId(filter.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverFilterId(filter.id); }}
                          onDrop={() => handleDrop(filter.id)}
                          onDragEnd={() => { setDraggingFilterId(null); setDragOverFilterId(null); }}
                          onClick={() => {
                            if (editingFilterId) return;
                            setCategory(filter.filters.category || "Todos");
                            setRecurrenceFilter(filter.filters.recurrenceFilter || "all");
                            setVariationsFilter(filter.filters.variationsFilter || "all");
                            setSort(filter.filters.sort || "name_asc");
                            setSelectedFilterId(filter.id);
                          }}
                          className={cn(
                            "group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none",
                            dragOverFilterId === filter.id && draggingFilterId !== filter.id
                              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                              : draggingFilterId === filter.id
                                ? "opacity-40"
                                : selectedFilterId === filter.id
                                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                                  : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300",
                          )}
                        >
                          <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab" />
                          {editingFilterId === filter.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={editingFilterName}
                              onChange={(e) => setEditingFilterName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter" && editingFilterName.trim()) {
                                  setSavedFilters(savedFilters.map((f) => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f));
                                  setEditingFilterId(null);
                                } else if (e.key === "Escape") setEditingFilterId(null);
                              }}
                              onBlur={() => {
                                if (editingFilterName.trim()) setSavedFilters(savedFilters.map((f) => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f));
                                setEditingFilterId(null);
                              }}
                              className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="flex-1 truncate">{filter.name}</span>
                          )}
                          {editingFilterId !== filter.id && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingFilterId(filter.id); setEditingFilterName(filter.name); }}
                                className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSavedFilters(savedFilters.filter((f) => f.id !== filter.id)); if (selectedFilterId === filter.id) setSelectedFilterId(null); }}
                                className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right — Filter Fields */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">

                  {/* Add field button */}
                  <div className="flex items-center justify-between">
                    <div className="relative">
                      <button
                        onClick={() => setShowFieldPicker(!showFieldPicker)}
                        className="text-[11px] font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Adicionar campo
                        <span className="ml-1 text-slate-400">{visibleFields.length} campos ativos</span>
                      </button>
                      {showFieldPicker && (
                        <div className="absolute top-6 left-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 w-44 space-y-0.5">
                          {allFilterFields.map((f) => (
                            <label
                              key={f.id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-colors",
                                visibleFields.includes(f.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/40",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={visibleFields.includes(f.id)}
                                onChange={() => setVisibleFields((v) => v.includes(f.id) ? v.filter((x) => x !== f.id) : [...v, f.id])}
                                className="accent-blue-500"
                              />
                              <span className="text-slate-700 dark:text-slate-300">{f.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CATEGORIA */}
                  {has("categoria") && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Categoria</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Todos", ...allCategories].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                              category === cat
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300",
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RECORRÊNCIA */}
                  {has("recorrencia") && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Recorrência / Tipo</p>
                      <div className="flex flex-wrap gap-1.5">
                        {RECURRENCE_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setRecurrenceFilter(value)}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                              recurrenceFilter === value
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                        {allRecurrences.filter((r) => !RECURRENCE_OPTIONS.map((o) => o.value).includes(r)).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRecurrenceFilter(r)}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                              recurrenceFilter === r
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300",
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VARIAÇÕES */}
                  {has("variacoes") && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Variações</p>
                      <div className="flex flex-wrap gap-1.5">
                        {VARIATIONS_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setVariationsFilter(value)}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                              variationsFilter === value
                                ? "bg-violet-500 text-white border-violet-500"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ORDENAR POR */}
                  {has("ordenar") && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ordenar por</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SORT_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setSort(value)}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                              sort === value
                                ? "bg-slate-700 text-white border-slate-700"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                <button
                  onClick={clearAdvancedFilters}
                  className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
                <div className="flex items-center gap-2">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        value={filterNameInput}
                        onChange={(e) => setFilterNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && filterNameInput.trim()) {
                            const newId = `filter-${Date.now()}`;
                            setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: { category, recurrenceFilter, variationsFilter, sort } }]);
                            setSelectedFilterId(newId);
                            setShowSaveInput(false);
                            setFilterNameInput("");
                          }
                          if (e.key === "Escape") { setShowSaveInput(false); setFilterNameInput(""); }
                        }}
                        placeholder={`Filtro ${savedFilters.length + 1}`}
                        className="h-7 px-2 rounded-md text-[11px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                      />
                      <button
                        disabled={!filterNameInput.trim()}
                        onClick={() => {
                          const newId = `filter-${Date.now()}`;
                          setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: { category, recurrenceFilter, variationsFilter, sort } }]);
                          setSelectedFilterId(newId);
                          setShowSaveInput(false);
                          setFilterNameInput("");
                        }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => { setShowSaveInput(false); setFilterNameInput(""); }}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length + 1}`); setShowSaveInput(true); }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                    >
                      Salvar filtro
                    </button>
                  )}
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={() => { setIsFilterModalOpen(false); setShowFieldPicker(false); }}
                    className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={applyAndClose}
                    className="h-7 px-4 rounded-md text-[11px] font-semibold btn-brand transition-all shadow-sm"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {mode === "panel" && selectedProducts.length > 0 && onConfirm && (
        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500">
                {selectedProducts.length} produto
                {selectedProducts.length !== 1 ? "s" : ""} selecionado
                {selectedProducts.length !== 1 ? "s" : ""}
              </p>
              <p className="text-base font-bold text-slate-900">
                {formatCurrency(totalSelected)}
              </p>
            </div>
            <Button
              className="h-10 px-5 text-sm font-semibold text-white border-0 shadow-sm"
              style={{
                background:
                  "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
              }}
              onClick={onConfirm}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Carrinho ({selectedProducts.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
