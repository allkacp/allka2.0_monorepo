// @ts-nocheck
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectBasket } from "@/contexts/project-basket-context";
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel";

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

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectBasketDrawer() {
  const basket = useProjectBasket();
  const { sidebarWidth } = useSidebar();
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const totalItems = basket.getTotalItems();
  const totalPrice = basket.getTotalPrice();
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
                {basket.items.map((item, index) => {
                  const CategoryIcon = getCategoryIcon(item.productCategory);
                  const gradient = getCategoryGradient(item.productCategory);
                  const deliveryDays = item.product?.deliveryDays;
                  const recurrence = item.product?.recurrence;
                  const summary =
                    item.product?.summaryDescription ||
                    item.product?.description;

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

                      <div className="pl-4 pr-4 pt-4 pb-3 ml-1">
                        {/* Row 1: image + info + remove */}
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          <div
                            className={cn(
                              "shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-linear-to-br",
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
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {/* Category */}
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 rounded-full px-2 py-0.5">
                                <CategoryIcon className="h-2.5 w-2.5" />
                                {item.productCategory}
                              </span>
                              {/* Variation */}
                              {item.selectedVariation && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-full px-2 py-0.5">
                                  <SlidersHorizontal className="h-2.5 w-2.5" />
                                  {item.selectedVariation.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => basket.removeItem(item.id)}
                            className="shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Row 2: meta badges */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          {recurrence && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-full px-2 py-0.5">
                              <RefreshCw className="h-2.5 w-2.5" />
                              {recurrence}
                            </span>
                          )}
                          {deliveryDays && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-full px-2 py-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {deliveryDays} dias
                            </span>
                          )}
                        </div>

                        {/* Row 3: summary */}
                        {summary && (
                          <p className="text-[11px] text-slate-400 dark:text-white/35 mt-2 line-clamp-2 leading-relaxed">
                            {summary}
                          </p>
                        )}

                        {/* Row 4: price + qty controls */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-white/5">
                          {/* Price */}
                          <div>
                            <p className="text-[10px] text-slate-400 dark:text-white/35 uppercase tracking-wide leading-none">
                              {item.quantity > 1
                                ? `${fmtBRL(item.finalPrice)} × ${item.quantity}`
                                : recurrence
                                  ? "por mês"
                                  : "valor"}
                            </p>
                            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                              {fmtBRL(item.finalPrice * item.quantity)}
                            </p>
                          </div>

                          {/* Qty controls */}
                          <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 rounded-xl p-0.5 overflow-hidden">
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
                            <span className="w-8 text-center text-sm font-bold text-slate-900 dark:text-white">
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
                    </div>
                  );
                })}

                {/* Spacer so footer shadow doesn't cover last item */}
                <div className="h-2" />
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          {hasItems && (
            <div className="shrink-0 border-t border-slate-100 dark:border-white/8 bg-white dark:bg-[#0f1117] px-5 py-4 space-y-3">
              {/* Summary row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-white/40 text-sm">
                  <Package className="h-4 w-4" />
                  <span>
                    {totalItems} {totalItems === 1 ? "item" : "itens"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 dark:text-white/35 uppercase tracking-wide leading-none">
                    Total estimado
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                    {fmtBRL(totalPrice)}
                  </p>
                </div>
              </div>

              {/* CTA — create project */}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setProjectPanelOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl text-white text-sm font-bold shadow-lg border-0 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background:
                    "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
                }}
              >
                <FolderPlus className="h-4 w-4" />
                Criar projeto com esses itens
                <ChevronRight className="h-4 w-4 opacity-70" />
              </button>

              {/* Secondary actions */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/50 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Continuar adicionando
                </button>
                <button
                  type="button"
                  onClick={() => basket.clearBasket()}
                  className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </button>
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
          if (!v) basket.clearBasket();
        }}
        onCreate={() => {
          basket.clearBasket();
          setProjectPanelOpen(false);
        }}
        allowCompanySelect={true}
        draftProducts={basket.items.map((i) => ({
          id: i.productId,
          name: i.productName,
          description:
            i.product?.summaryDescription ?? i.product?.description ?? "",
          category: i.productCategory,
          finalPrice: i.finalPrice,
          image: i.productImage,
          quantity: i.quantity,
        }))}
        draftProductQuantities={Object.fromEntries(
          basket.items.map((i) => [i.productId, i.quantity]),
        )}
      />
    </>
  );
}
