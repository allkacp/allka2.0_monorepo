import { useMemo, useState } from "react";
import { ArrowRight, FolderPlus, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CatalogCartStickyBarItem {
  id: string;
  productId: string;
  productName: string;
  finalPrice: number;
  quantity: number;
  productImage?: string;
  productDescription?: string;
}

interface CatalogCartStickyBarProps {
  items: CatalogCartStickyBarItem[];
  total: number;
  projectId?: string | null;
  sidebarOffset?: number;
  onPrimaryAction: () => void;
  onClearCart: () => void;
  onContinueShopping?: () => void;
  onUpdateQuantity?: (id: string, qty: number) => void;
  onRemoveItem?: (id: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function CatalogCartStickyBar({
  items,
  total,
  projectId,
  sidebarOffset = 0,
  onPrimaryAction,
  onClearCart,
  onContinueShopping,
  onUpdateQuantity,
  onRemoveItem,
}: CatalogCartStickyBarProps) {
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const summary = useMemo(() => items.slice(0, 3), [items]);
  const primaryLabel = projectId ? "VER PROJETO" : "CRIAR PROJETO COM ESTES ITENS";

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 z-30 px-3 pb-3 sm:px-4 lg:px-6 pointer-events-none"
      style={{ left: sidebarOffset, right: 0 }}
    >
      <div className="pointer-events-auto">
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/88 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/88">
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))" }}
          />
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] text-white dark:bg-white dark:text-slate-950">
                  <ShoppingCart className="mr-1 h-3 w-3" />
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white/70 px-2.5 py-0.5 text-[11px] dark:border-slate-700 dark:bg-slate-900/70"
                >
                  Total {formatCurrency(total)}
                </Badge>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {projectId ? "Projeto pronto para abrir" : "Pronto para criar um novo projeto"}
                </p>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="truncate">
                    {summary.length > 0
                      ? `${summary[0].productName}${summary.length > 1 ? ` +${summary.length - 1}` : ""}`
                      : "Nenhum item"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setItemsDialogOpen(true)}
                    className="h-6 shrink-0 rounded-full px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    Ver itens
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:max-w-xs lg:min-w-0 lg:grid-cols-2">
              <Button
                variant="outline"
                onClick={onClearCart}
                className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white/80 px-3 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </Button>
              <Button
                variant="ghost"
                onClick={onContinueShopping}
                className="h-9 gap-1.5 rounded-xl px-3 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Continuar
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              onClick={onPrimaryAction}
              className={cn(
                "h-10 rounded-xl px-4 text-xs font-bold text-white shadow-lg shadow-fuchsia-500/25 transition-all hover:-translate-y-0.5",
              )}
              style={{
                background:
                  "var(--app-brand-button, var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)))",
              }}
            >
              {projectId ? <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> : <FolderPlus className="mr-1.5 h-3.5 w-3.5" />}
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
        <DialogContent
          className="w-[min(98vw,1900px)] max-w-none overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-[0_30px_90px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-950"
          style={{
            left: `calc(${sidebarOffset}px + 28px)`,
            width: `calc(100vw - ${sidebarOffset + 56}px)`,
            maxWidth: `calc(100vw - ${sidebarOffset + 56}px)`,
            translate: "0 -50%",
          }}
        >
          <div
            className="px-4 py-2.5 text-white sm:px-5 sm:py-3"
            style={{
              background:
                "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
            }}
          >
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                Produtos adicionados
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-snug text-white/75 sm:text-xs">
                Ajuste quantidades, revise o resumo e remova itens antes de continuar.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-4 py-4 sm:px-6">
            <div className="space-y-3">
              {items.map((item) => {
                const summary =
                  item.productDescription?.trim() ||
                  item.product?.summaryDescription?.trim() ||
                  item.product?.description?.trim() ||
                  "";
                return (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <div className="grid gap-4 p-4 sm:grid-cols-[88px_1fr_auto] sm:items-center">
                      <div className="relative h-22 w-22 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center"
                            style={{
                              background:
                                "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
                            }}
                          >
                            <ShoppingCart className="h-5 w-5 text-white/90" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-bold text-slate-900 dark:text-white">
                            {item.productName}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {formatCurrency(item.finalPrice)} cada
                          </span>
                        </div>
                        {summary && (
                          <p className="max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                            {summary}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                            {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                            Total {formatCurrency(item.finalPrice * item.quantity)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onUpdateQuantity?.(item.id, item.quantity - 1)}
                            disabled={!onUpdateQuantity || item.quantity <= 1}
                            className="h-9 w-9 rounded-lg px-0 text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <span className="text-lg leading-none">−</span>
                          </Button>
                          <span className="min-w-9 px-2 text-center text-sm font-bold text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                            disabled={!onUpdateQuantity}
                            className="h-9 w-9 rounded-lg px-0 text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <span className="text-lg leading-none">+</span>
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => onRemoveItem?.(item.id)}
                          disabled={!onRemoveItem}
                          className="h-10 gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            <Button
              variant="outline"
              onClick={() => setItemsDialogOpen(false)}
              className="rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
