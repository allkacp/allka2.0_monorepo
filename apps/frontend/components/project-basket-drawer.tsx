// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  X,
  Briefcase,
  Trash2,
  Minus,
  Plus,
  Package,
  FolderPlus,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Megaphone,
  Palette,
  Code,
  Globe,
  TrendingUp,
  FileText,
  Video,
  Zap,
  Search,
  Building2,
  User,
  Percent,
  LayoutList,
  Columns2,
  Columns3,
  Columns4,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectBasket } from "@/contexts/project-basket-context";
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel";
import { ProductDetailSheet } from "@/components/product-detail-sheet";
import { ButtonLoader } from "@/components/ui/loading";

// ─── Category → icon map (mirrors product-catalog-view) ─────────────────────
const CATEGORY_ICONS: Record<string, any> = {
  "Mídias e Conteúdo": Megaphone,
  "Design e Audiovisual": Palette,
  "Design Gráfico": Palette,
  Design: Palette,
  Desenvolvimento: Code,
  "Desenvolvimento Web": Code,
  Web: Globe,
  Marketing: TrendingUp,
  "Marketing Digital": TrendingUp,
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

const CATEGORY_GRADIENTS: Record<string, string> = {
  Marketing: "from-blue-500 to-indigo-600",
  "Marketing Digital": "from-blue-500 to-indigo-600",
  "Tráfego Pago": "from-orange-500 to-pink-600",
  Tráfego: "from-orange-500 to-pink-600",
  "Mídias e Conteúdo": "from-violet-500 to-purple-700",
  "Social Media": "from-violet-500 to-purple-700",
  Design: "from-pink-500 to-rose-600",
  "Design Gráfico": "from-pink-500 to-rose-600",
  "Design e Audiovisual": "from-pink-500 to-rose-600",
  Branding: "from-pink-500 to-rose-600",
  Desenvolvimento: "from-emerald-500 to-teal-700",
  "Desenvolvimento Web": "from-emerald-500 to-teal-700",
  Web: "from-cyan-500 to-blue-600",
  Conteúdo: "from-amber-500 to-orange-600",
  Vídeo: "from-red-500 to-pink-600",
  Audiovisual: "from-red-500 to-pink-600",
  Automação: "from-yellow-500 to-amber-600",
  SEO: "from-lime-500 to-green-600",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Commission helpers ───────────────────────────────────────────────────────

function getDefaultCommission() {
  return {
    tipoComissao: "PERCENTUAL" as const,
    percentualComissao: 0,
    valorComissao: 0,
    pagador: "AGENCIA" as const,
  };
}

function calcItemClientPrice(item: any): number {
  const base = item.finalPrice * item.quantity;
  const c = item.commissionData;
  if (!c || c.pagador === "AGENCIA") return base;
  if (c.tipoComissao === "PERCENTUAL")
    return base + (base * c.percentualComissao) / 100;
  return base + c.valorComissao * item.quantity;
}

function calcItemCommissionValue(item: any): number {
  const base = item.finalPrice * item.quantity;
  const c = item.commissionData;
  if (!c) return 0;
  if (c.tipoComissao === "PERCENTUAL")
    return (base * c.percentualComissao) / 100;
  return c.valorComissao * item.quantity;
}

// ─── View mode (list / grid 2 / grid 3 / grid 4) ─────────────────────────────

type BasketViewMode = "list" | "grid2" | "grid3" | "grid4";

const VIEW_MODE_STORAGE_KEY = "allka_cart_view_mode";

const VIEW_MODE_OPTIONS: Array<{
  value: BasketViewMode;
  label: string;
  Icon: any;
  /** Min viewport width (px) below which this option is hidden. */
  minWidth: number;
}> = [
  { value: "list", label: "Lista", Icon: LayoutList, minWidth: 0 },
  { value: "grid2", label: "2 colunas", Icon: Columns2, minWidth: 0 },
  { value: "grid3", label: "3 colunas", Icon: Columns3, minWidth: 768 },
  { value: "grid4", label: "4 colunas", Icon: Columns4, minWidth: 1280 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectBasketDrawer() {
  const basket = useProjectBasket();
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  /** Loading state when preparing/opening the project creation drawer */
  const [isPreparingProject, setIsPreparingProject] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  /** Product currently being inspected via the detail sheet. */
  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  /** View mode for the basket items — persisted in localStorage. */
  const [viewMode, setViewMode] = useState<BasketViewMode>(() => {
    if (typeof window === "undefined") return "list";
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (
        stored === "list" ||
        stored === "grid2" ||
        stored === "grid3" ||
        stored === "grid4"
      ) {
        return stored;
      }
    } catch {}
    return "list";
  });
  /** Tracks viewport width to gate which view modes are available on smaller screens. */
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // If the active view mode is no longer allowed on the current viewport, fall back.
  useEffect(() => {
    const opt = VIEW_MODE_OPTIONS.find((o) => o.value === viewMode);
    if (opt && viewportWidth < opt.minWidth) {
      setViewMode("grid2");
    }
  }, [viewMode, viewportWidth]);

  const persistViewMode = (mode: BasketViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  };

  const isGrid = viewMode !== "list";
  const gridColsClass =
    viewMode === "grid2"
      ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
      : viewMode === "grid3"
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
        : viewMode === "grid4"
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3"
          : "";

  const totalItems = basket.getTotalItems();
  const totalPrice = basket.getTotalPrice();
  const clientTotal = basket.getClientTotal();
  const hasCommissions = clientTotal > totalPrice;
  const hasItems = basket.items.length > 0;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      basket.setOpen(false);
    }, 420);
  };

  // ── Helpers
  const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || Package;
  const getCategoryGradient = (cat: string) =>
    CATEGORY_GRADIENTS[cat] || "from-slate-500 to-slate-700";

  const isVisible = basket.isOpen || isClosing;

  return (
    <>
      {/* ── Overlay — offset pela sidebar ──────────────────────── */}
      {isVisible && (
        <div
          className={cn(
            "fixed top-0 bottom-0 right-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-420",
            isClosing ? "opacity-0" : "opacity-100",
          )}
          style={{ left: `${sidebarWidth}px` }}
          onClick={handleClose}
        />
      )}

      {/* ── Drawer — de left:sidebarWidth até a direita ────────── */}
      {isVisible && (
        <div
          className={cn(
            "fixed top-0 right-0 z-50 flex flex-col",
            "bg-background shadow-2xl",
            "h-[calc(100vh-24px)]",
            "transition-transform duration-420 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isClosing ? "translate-x-full" : "translate-x-0",
          )}
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div
            className="shrink-0 px-6 py-5 relative overflow-hidden"
            style={{
              background:
                "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
            }}
          >
            {/* decorative glow blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-purple-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-6 left-1/3 w-32 h-32 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* icon backdrop */}
                <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20 shrink-0">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-white leading-tight">
                    Cesta do projeto
                  </p>
                  <p className="text-xs text-white/55 mt-0.5">
                    {totalItems === 0
                      ? "Nenhum produto adicionado"
                      : `${totalItems} ${totalItems === 1 ? "produto" : "produtos"} selecionado${totalItems !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar (visual) */}
            {hasItems && (
              <div className="relative mt-4">
                <div className="flex items-center justify-between text-[10px] text-white/50 mb-1.5">
                  <span>ETAPA 1 DE 2</span>
                  <span>Revisão da cesta</span>
                </div>
                <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-400 to-pink-400 transition-all duration-500"
                    style={{ width: "50%" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Items ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* ── Empty state ── */}
            {!hasItems && (
              <div className="flex flex-col items-center justify-center h-full gap-5 px-8 py-12 text-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-white/20" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800 dark:text-white">
                    Cesta vazia
                  </p>
                  <p className="text-sm text-slate-400 dark:text-white/40 mt-1 leading-relaxed max-w-xs mx-auto">
                    Explore o catálogo e adicione os serviços que você precisa
                    para montar seu projeto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                  Ir para o catálogo
                </button>
              </div>
            )}

            {/* ── Item list ── */}
            {hasItems && (
              <div className="p-4 space-y-3">
                {/* View mode toolbar */}
                <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 py-2.5 bg-background/95 backdrop-blur-sm border-b border-slate-100 dark:border-white/8 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">
                    Visualização
                  </span>
                  <div
                    className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    role="group"
                    aria-label="Modo de visualização da cesta"
                  >
                    {VIEW_MODE_OPTIONS.map(
                      ({ value, label, Icon, minWidth }) => {
                        const disabled = viewportWidth < minWidth;
                        const active = viewMode === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={disabled}
                            onClick={() => persistViewMode(value)}
                            title={
                              disabled
                                ? `${label} (indisponível neste tamanho de tela)`
                                : label
                            }
                            aria-label={label}
                            aria-pressed={active}
                            className={cn(
                              "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                              active
                                ? "text-white shadow-sm"
                                : "text-slate-500 dark:text-white/50 hover:bg-white dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white",
                              disabled &&
                                "opacity-30 cursor-not-allowed hover:bg-transparent",
                            )}
                            style={
                              active
                                ? {
                                    background:
                                      "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                                  }
                                : undefined
                            }
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className={isGrid ? gridColsClass : "space-y-3"}>
                  {basket.items.map((item) => {
                    const CategoryIcon = getCategoryIcon(item.productCategory);
                    const gradient = getCategoryGradient(item.productCategory);
                    const deliveryDays = item.product?.deliveryDays;
                    const recurrence = item.product?.recurrence;
                    const productDefaultSummary =
                      item.product?.summaryDescription ||
                      item.product?.description ||
                      "";
                    const hasCommission =
                      item.commissionData && calcItemCommissionValue(item) > 0;
                    const c = item.commissionData ?? getDefaultCommission();
                    const commVal = calcItemCommissionValue(item);
                    const clientPrc = calcItemClientPrice(item);

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl border border-slate-100 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        {/* left accent bar */}
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-linear-to-b",
                            gradient,
                          )}
                        />

                        {/* ── Compact card body ──────────────────────────────── */}
                        <div
                          className={cn(
                            "ml-1 flex gap-3",
                            isGrid
                              ? "flex-col px-3 py-3"
                              : "flex-col sm:flex-row px-3 py-2",
                          )}
                        >
                          {/* ── MAIN COLUMN: info, meta, price + qty ── */}
                          <div
                            className={cn(
                              "flex-1 min-w-0 flex flex-col",
                              isGrid ? "gap-2" : "gap-1.5",
                            )}
                          >
                            {/* Row 1: thumbnail + name/code/badges + remove */}
                            <div className="flex gap-3">
                              {/* Thumbnail */}
                              <div
                                className={cn(
                                  "shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-linear-to-br",
                                  isGrid ? "w-12 h-12" : "w-10 h-10",
                                  gradient,
                                )}
                              >
                                {item.productImage ? (
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <CategoryIcon className="h-5 w-5 text-white/90" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">
                                  {item.productName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  {item.product?.code && (
                                    <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-white/35 tracking-wide">
                                      {item.product.code}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 rounded-full px-1.5 py-0.5">
                                    <CategoryIcon className="h-3 w-3" />
                                    {item.productCategory}
                                  </span>
                                  {item.selectedVariation && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-full px-1.5 py-0.5">
                                      <SlidersHorizontal className="h-3 w-3" />
                                      {item.selectedVariation.name}
                                    </span>
                                  )}
                                  {recurrence && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-full px-1.5 py-0.5">
                                      <RefreshCw className="h-3 w-3" />
                                      {recurrence}
                                    </span>
                                  )}
                                  {deliveryDays && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-full px-1.5 py-0.5">
                                      <Clock className="h-3 w-3" />
                                      {deliveryDays}d
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => basket.removeItem(item.id)}
                                className="shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all self-start"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Auto summary from platform + Ver detalhes */}
                            <div
                              className={cn(
                                isGrid ? "space-y-1.5" : "space-y-0.5",
                              )}
                            >
                              {productDefaultSummary && (
                                <p
                                  className={cn(
                                    "text-xs text-slate-500 dark:text-white/45 leading-snug",
                                    isGrid ? "line-clamp-2" : "line-clamp-1",
                                  )}
                                >
                                  {productDefaultSummary}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailProduct({
                                    ...(item.product ?? {}),
                                    id: item.productId,
                                    name: item.productName,
                                    category: item.productCategory,
                                    finalPrice: item.finalPrice,
                                    presentation:
                                      item.product?.presentation ?? null,
                                    variations: item.product?.variations ?? [],
                                    demonstrations:
                                      item.product?.demonstrations ?? [],
                                    summaryDescription:
                                      item.product?.summaryDescription ??
                                      item.product?.description ??
                                      null,
                                    description:
                                      item.product?.description ?? null,
                                    image:
                                      item.productImage ??
                                      item.product?.productImagePreview ??
                                      item.product?.coverImage,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
                              >
                                <Info className="h-3 w-3" />
                                Ver detalhes do produto
                              </button>
                            </div>

                            {/* Price + qty row (push to bottom) */}
                            <div
                              className={cn(
                                "flex items-center justify-between gap-3 mt-auto border-t border-slate-50 dark:border-white/5",
                                isGrid ? "pt-2" : "pt-1.5",
                              )}
                            >
                              <div>
                                <p className="text-[10px] text-slate-400 dark:text-white/35 uppercase tracking-wide leading-none">
                                  {item.quantity > 1
                                    ? `${fmtBRL(item.finalPrice)} × ${item.quantity}`
                                    : recurrence
                                      ? "por mês"
                                      : "custo agência"}
                                </p>
                                <p
                                  className={cn(
                                    "font-extrabold leading-tight mt-0.5 text-slate-900 dark:text-white",
                                    isGrid ? "text-lg" : "text-base",
                                  )}
                                >
                                  {fmtBRL(item.finalPrice * item.quantity)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 rounded-xl p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    basket.updateQuantity(
                                      item.id,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-slate-500 dark:text-white/40 transition-colors"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-7 text-center text-sm font-bold text-slate-900 dark:text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    basket.updateQuantity(
                                      item.id,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 text-slate-500 dark:text-white/40 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ── COMMISSION SIDE BOX (always visible, no expand) ── */}
                          <div
                            className={cn(
                              "shrink-0 flex flex-col w-full",
                              isGrid ? "self-stretch" : "sm:w-64 self-start",
                            )}
                          >
                            <div
                              className="p-px rounded-2xl flex-1 flex flex-col"
                              style={{
                                background:
                                  "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                              }}
                            >
                              <div className="rounded-[15px] bg-white dark:bg-[#0f1117] flex-1 flex flex-col overflow-hidden">
                                {/* Header: title + %/R$ toggle */}
                                <div
                                  className="px-3 py-1.5 flex items-center justify-between shrink-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                                  }}
                                >
                                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <Percent className="h-3.5 w-3.5" />
                                    Comissão
                                  </span>
                                  <div className="flex bg-white/15 rounded-md p-0.5 gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        basket.updateCommission(item.id, {
                                          tipoComissao: "PERCENTUAL",
                                        })
                                      }
                                      className={cn(
                                        "h-5 px-2 rounded text-[10px] font-bold transition-colors",
                                        c.tipoComissao === "PERCENTUAL"
                                          ? "bg-white text-violet-700"
                                          : "text-white/80 hover:text-white",
                                      )}
                                    >
                                      %
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        basket.updateCommission(item.id, {
                                          tipoComissao: "VALOR_FIXO",
                                        })
                                      }
                                      className={cn(
                                        "h-5 px-2 rounded text-[10px] font-bold transition-colors",
                                        c.tipoComissao === "VALOR_FIXO"
                                          ? "bg-white text-violet-700"
                                          : "text-white/80 hover:text-white",
                                      )}
                                    >
                                      R$
                                    </button>
                                  </div>
                                </div>

                                {/* Body: input + pagador + breakdown */}
                                <div
                                  className={cn(
                                    "flex flex-col flex-1",
                                    isGrid
                                      ? "px-3 py-2 gap-1.5"
                                      : "px-2.5 py-1.5 gap-1",
                                  )}
                                >
                                  {/* Value input */}
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min={0}
                                      step={
                                        c.tipoComissao === "PERCENTUAL"
                                          ? 0.5
                                          : 1
                                      }
                                      value={
                                        c.tipoComissao === "PERCENTUAL"
                                          ? c.percentualComissao || ""
                                          : c.valorComissao || ""
                                      }
                                      placeholder="0"
                                      onChange={(e) => {
                                        const v =
                                          parseFloat(e.target.value) || 0;
                                        basket.updateCommission(
                                          item.id,
                                          c.tipoComissao === "PERCENTUAL"
                                            ? { percentualComissao: v }
                                            : { valorComissao: v },
                                        );
                                      }}
                                      className="w-full h-8 text-sm text-center font-extrabold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all pr-7"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none font-bold">
                                      {c.tipoComissao === "PERCENTUAL"
                                        ? "%"
                                        : "R$"}
                                    </span>
                                  </div>

                                  {/* Pagador toggle */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        basket.updateCommission(item.id, {
                                          pagador: "AGENCIA",
                                        })
                                      }
                                      className={cn(
                                        "flex items-center justify-center gap-1 h-7 rounded-lg border text-[11px] font-bold transition-all",
                                        c.pagador === "AGENCIA"
                                          ? "border-blue-300 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                          : "border-slate-100 dark:border-white/8 text-slate-400 hover:border-slate-200 dark:hover:border-white/15",
                                      )}
                                    >
                                      <Building2 className="h-3 w-3" />
                                      Agência
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        basket.updateCommission(item.id, {
                                          pagador: "CLIENTE",
                                        })
                                      }
                                      className={cn(
                                        "flex items-center justify-center gap-1 h-7 rounded-lg border text-[11px] font-bold transition-all",
                                        c.pagador === "CLIENTE"
                                          ? "border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                          : "border-slate-100 dark:border-white/8 text-slate-400 hover:border-slate-200 dark:hover:border-white/15",
                                      )}
                                    >
                                      <User className="h-3 w-3" />
                                      Cliente
                                    </button>
                                  </div>

                                  {/* Breakdown */}
                                  <div className="rounded-lg border border-slate-100 dark:border-white/8 bg-slate-50/70 dark:bg-white/3 p-1.5 space-y-0.5 mt-auto">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-500">
                                        Base
                                      </span>
                                      <span className="font-semibold text-slate-700 dark:text-white/70">
                                        {fmtBRL(
                                          item.finalPrice * item.quantity,
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-500">
                                        Comissão
                                      </span>
                                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                        +{fmtBRL(commVal)}
                                      </span>
                                    </div>
                                    <div className="border-t border-slate-100 dark:border-white/8 pt-1 flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-white/80">
                                        {c.pagador === "CLIENTE"
                                          ? "Cliente paga"
                                          : "Total ref."}
                                      </span>
                                      <span
                                        className="text-sm font-extrabold"
                                        style={{
                                          backgroundImage:
                                            "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                                          WebkitBackgroundClip: "text",
                                          WebkitTextFillColor: "transparent",
                                          backgroundClip: "text",
                                        }}
                                      >
                                        {fmtBRL(clientPrc)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Spacer so footer shadow doesn't cover last item */}
                <div className="h-2" />
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          {hasItems && (
            <div className="shrink-0 border-t border-slate-100 dark:border-white/8 bg-white dark:bg-[#0f1117] px-4 py-2.5">
              {/* Error message */}
              {prepareError && (
                <div className="flex items-start gap-2 px-3 py-1.5 mb-2 rounded-xl border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                  <span className="text-xs font-medium leading-tight">
                    {prepareError}
                  </span>
                </div>
              )}

              {/* Single row: [← Continuar] [Criar projeto →] [Limpar]  |  TOTAL */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Continuar adicionando */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-600 dark:text-white/50 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  <ArrowRight className="h-3 w-3 rotate-180 shrink-0" />
                  Continuar adicionando
                </button>

                {/* Criar projeto — botão principal */}
                <button
                  type="button"
                  disabled={isPreparingProject}
                  onClick={() => {
                    if (isPreparingProject) return;
                    setPrepareError(null);
                    setIsPreparingProject(true);
                    try {
                      handleClose();
                      setTimeout(() => {
                        try {
                          setProjectPanelOpen(true);
                        } catch (err) {
                          setPrepareError(
                            "Não foi possível iniciar o projeto com esses itens.",
                          );
                          setIsPreparingProject(false);
                        }
                      }, 430);
                    } catch (err) {
                      setPrepareError(
                        "Não foi possível iniciar o projeto com esses itens.",
                      );
                      setIsPreparingProject(false);
                    }
                  }}
                  className="shrink-0 flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg text-xs text-white font-bold shadow border-0 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap"
                  style={{
                    background:
                      "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
                  }}
                >
                  {isPreparingProject ? (
                    <ButtonLoader text="Preparando…" />
                  ) : (
                    <>
                      <FolderPlus className="h-3 w-3 shrink-0" />
                      Criar projeto com esses itens
                      <ChevronRight className="h-3 w-3 opacity-70 shrink-0" />
                    </>
                  )}
                </button>

                {/* Limpar */}
                <button
                  type="button"
                  onClick={() => basket.clearBasket()}
                  className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="h-3 w-3 shrink-0" />
                  Limpar
                </button>

                {/* Spacer */}
                <div className="flex-1 hidden sm:block" />

                {/* Divider */}
                <div className="hidden sm:block w-px h-8 bg-slate-100 dark:bg-white/8 shrink-0" />

                {/* Total */}
                <div className="shrink-0 flex items-baseline gap-2 pl-1 pr-1">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-slate-400 dark:text-white/35">
                      <Package className="h-2.5 w-2.5" />
                      <span className="text-[9px] uppercase tracking-wide">
                        {totalItems} {totalItems === 1 ? "item" : "itens"}
                      </span>
                    </div>
                    {hasCommissions ? (
                      <div className="flex items-baseline gap-2">
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 dark:text-white/35 uppercase tracking-wide leading-none">
                            Agência
                          </p>
                          <p className="text-sm font-bold text-slate-500 dark:text-white/50 leading-tight">
                            {fmtBRL(totalPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-emerald-500 uppercase tracking-wide leading-none">
                            Cliente
                          </p>
                          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                            {fmtBRL(clientTotal)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[9px] text-slate-400 dark:text-white/35 uppercase tracking-wide leading-none">
                          Total estimado
                        </p>
                        <p
                          className="text-base font-extrabold leading-tight"
                          style={{
                            backgroundImage:
                              "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {fmtBRL(totalPrice)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── Project creation panel (same flow as Admin > Projetos > Novo Projeto) ── */}
      <ProjectCreateNewPanel
        open={projectPanelOpen}
        onOpenChange={(v) => {
          setProjectPanelOpen(v);
          // Drawer mounted/opened — clear preparing state
          if (v) setIsPreparingProject(false);
          // Do NOT clear basket here — only clear on successful project creation
        }}
        onCreate={(project) => {
          basket.clearBasket();
          setProjectPanelOpen(false);
          setIsPreparingProject(false);
          handleClose();
          // Navigate to the correct projects page so the user is not left on the catalog
          if (project?.id) {
            const path = location.pathname;
            let basePath = "/admin";
            if (path.startsWith("/agency")) basePath = "/agency";
            else if (path.startsWith("/agencia")) basePath = "/agency";
            else if (path.startsWith("/empresa")) basePath = "/empresa";
            else if (path.startsWith("/company")) basePath = "/company";
            else if (path.startsWith("/lider")) basePath = "/lider";
            navigate(`${basePath}/projetos`, {
              state: {
                openProjectId: project.id,
                openProjectTab: project.openTab ?? "dashboard",
              },
            });
          }
        }}
        allowCompanySelect={true}
        draftProducts={basket.items.map((i) => ({
          // Spread the full product object first so all fields (recurrence, deliveryDays, etc.) flow through
          ...(i.product ?? {}),
          // Override with basket-tracked values to ensure correctness
          id: i.productId,
          name: i.productName,
          description:
            i.product?.summaryDescription ?? i.product?.description ?? "",
          category: i.productCategory,
          finalPrice: i.finalPrice,
          image:
            i.productImage ??
            i.product?.productImagePreview ??
            i.product?.coverImage,
          quantity: i.quantity,
          selectedVariation: i.selectedVariation ?? undefined,
          customizations: {},
        }))}
        draftProductQuantities={Object.fromEntries(
          basket.items.map((i) => [i.productId, i.quantity]),
        )}
        draftCommissions={Object.fromEntries(
          basket.items
            .filter(
              (i) =>
                i.commissionData &&
                i.commissionData.tipoComissao === "PERCENTUAL",
            )
            .map((i) => [i.productId, i.commissionData.percentualComissao]),
        )}
        draftCommissionData={Object.fromEntries(
          basket.items
            .filter((i) => i.commissionData)
            .map((i) => [i.productId, i.commissionData]),
        )}
      />

      {/* ── Product detail sheet (read-only "Ver detalhes" from a basket item) ── */}
      <ProductDetailSheet
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(v) => {
          if (!v) setDetailProduct(null);
        }}
        isSelected={true}
      />
    </>
  );
}
